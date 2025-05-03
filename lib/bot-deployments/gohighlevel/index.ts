import axios from "axios";
import crypto from "crypto";
import { gohighlevelConfig } from "./config";
import prisma from "@/lib/db/prisma";
import { $Enums } from "@/lib/generated/prisma";
import type {
  GoHighLevelClientOptions,
  GoHighLevelCredentials,
  GoHighLevelMessage,
  GoHighLevelMessageType,
  GoHighLevelDeploymentConfig,
} from "./types";
import { assistantConversationMessage } from "./lib/events/conversation/message";
import { InputJsonValue } from "@/lib/generated/prisma/runtime/library";

// Function to refresh an expired access token
export async function refreshGoHighLevelToken(
  refreshToken: string
): Promise<GoHighLevelCredentials> {
  // Create form data with required parameters
  const formData = new URLSearchParams();
  formData.append("client_id", gohighlevelConfig.clientId);
  formData.append("client_secret", gohighlevelConfig.clientSecret);
  formData.append("grant_type", "refresh_token");
  formData.append("refresh_token", refreshToken);
  formData.append("user_type", "Location"); // Request a Location token

  const response = await fetch(`${gohighlevelConfig.apiEndpoint}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to refresh token: ${errorText}`);
  }

  const data = await response.json();

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
    scope: data.scope,
    locationId: data.locationId,
  };
}

// Create a GoHighLevel API client
export async function createGoHighLevelClient(
  options: GoHighLevelClientOptions
) {
  const { token, version = gohighlevelConfig.apiVersion } = options;

  const apiClient = axios.create({
    baseURL: gohighlevelConfig.apiEndpoint,
    headers: {
      Authorization: `Bearer ${token}`,
      Version: version,
      "Content-Type": "application/json",
    },
  });

  // Add request/response interceptors for better error handling
  apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      // Handle token expiration
      if (
        error.response &&
        error.response.status === 401 &&
        !originalRequest._retry
      ) {
        originalRequest._retry = true;

        try {
          // Find the credential by the token
          const credential = await prisma.credential.findFirst({
            where: {
              credentials: {
                path: ["access_token"],
                equals: token,
              },
              provider: "gohighlevel",
            },
          });

          if (!credential) {
            throw new Error("Credential not found for token refresh");
          }

          const credentials =
            credential.credentials as unknown as GoHighLevelCredentials;

          if (!credentials.refresh_token) {
            throw new Error("No refresh token available");
          }

          // Refresh the token
          const newTokenData = await refreshGoHighLevelToken(
            credentials.refresh_token
          );

          // Update the credential in the database
          await prisma.credential.update({
            where: {
              id: credential.id,
            },
            data: {
              credentials: {
                access_token: newTokenData.access_token,
                refresh_token: newTokenData.refresh_token,
                expires_at: newTokenData.expires_at,
                scope: newTokenData.scope,
                locationId: newTokenData.locationId,
              } as InputJsonValue,
            },
          });

          // Update the request with the new token
          originalRequest.headers.Authorization = `Bearer ${newTokenData.access_token}`;
          return axios(originalRequest);
        } catch (refreshError) {
          console.error("Token refresh failed:", refreshError);
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    }
  );

  return apiClient;
}

// Get client by user ID
export async function getGoHighLevelClient(userId: string) {
  const credential = await prisma.credential.findFirst({
    where: {
      userId,
      provider: "gohighlevel",
    },
  });

  if (!credential) {
    throw new Error("GoHighLevel credentials not found");
  }

  const credentials =
    credential.credentials as unknown as GoHighLevelCredentials;

  return createGoHighLevelClient({
    token: credentials.access_token,
  });
}

// Send a message via GoHighLevel
export async function sendMessage(
  client: ReturnType<typeof createGoHighLevelClient>,
  message: GoHighLevelMessage
) {
  try {
    const response = await (
      await client
    ).post("/conversations/messages", message);

    return {
      success: true,
      messageId: response.data.messageId,
      conversationId: response.data.conversationId,
    };
  } catch (error) {
    console.error("Error sending GoHighLevel message:", error);
    return { success: false, error };
  }
}

// Check if a contact has the kill_switch tag
export async function checkContactHasKillSwitch(
  client: ReturnType<typeof createGoHighLevelClient>,
  contactId: string,
  locationId: string
) {
  try {
    // Get contact's tags
    const response = await (
      await client
    ).get(`/contacts/${contactId}/tags`, {
      params: {
        locationId,
      },
    });

    // Check if one of the tags is kill_switch
    return (
      response.data?.tags?.some(
        (tag: { name: string }) => tag.name.toLowerCase() === "kill_switch"
      ) || false
    );
  } catch (error) {
    console.error("Error checking for kill_switch tag:", error);
    return false; // Default to allowing messages if tag check fails
  }
}

// Verify the signature of incoming webhook requests
export function verifyWebhookSignature(
  payload: string,
  signature: string
): boolean {
  try {
    const verifier = crypto.createVerify("SHA256");
    verifier.update(payload);
    return verifier.verify(gohighlevelConfig.publicKey, signature, "base64");
  } catch (error) {
    console.error("Error verifying webhook signature:", error);
    return false;
  }
}

// Get active GoHighLevel integrations for a bot
export async function getActiveGoHighLevelIntegrations(botId: string) {
  const integrations = await prisma.integration.findMany({
    where: {
      botId,
      provider: "gohighlevel",
      connectionStatus: $Enums.ConnectionStatus.CONNECTED,
    },
    include: {
      credential: true,
      deployments: {
        where: {
          type: $Enums.DeploymentType.GOHIGHLEVEL,
        },
      },
    },
  });

  return integrations;
}

// Get available locations for a company/agency
export async function getAvailableLocations(token: string, companyId: string) {
  try {
    const response = await fetch(
      `${gohighlevelConfig.apiEndpoint}/oauth/installedLocations?companyId=${companyId}&appId=${gohighlevelConfig.clientId}&isInstalled=true`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Version: gohighlevelConfig.apiVersion,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get locations: ${await response.text()}`);
    }

    const data = await response.json();
    return data.locations || [];
  } catch (error) {
    console.error("Error fetching available locations:", error);
    return [];
  }
}

// Generate a location token from agency token
export async function getLocationToken(
  agencyToken: string,
  companyId: string,
  locationId: string
) {
  try {
    // Create form data with required parameters
    const formData = new URLSearchParams();
    formData.append("companyId", companyId);
    formData.append("locationId", locationId);

    const response = await fetch(
      `${gohighlevelConfig.apiEndpoint}/oauth/locationToken`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${agencyToken}`,
          "Content-Type": "application/x-www-form-urlencoded",
          Version: gohighlevelConfig.apiVersion,
        },
        body: formData.toString(),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get location token: ${await response.text()}`);
    }

    const data = await response.json();
    return {
      access_token: data.access_token,
      token_type: data.token_type,
      expires_in: data.expires_in,
      scope: data.scope,
      locationId: data.locationId,
    };
  } catch (error) {
    console.error("Error getting location token:", error);
    throw error;
  }
}

// Check if a channel is enabled in the deployment config
export function isChannelEnabled(
  deploymentConfig: GoHighLevelDeploymentConfig,
  messageType: GoHighLevelMessageType
): boolean {
  const channels = deploymentConfig?.channels || [];
  return channels.some((ch) => ch.type === messageType && ch.active === true);
}

// Export the message handler for reuse
export { assistantConversationMessage };
