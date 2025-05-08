import axios from "axios";
import { gohighlevelConfig } from "../../config";
import prisma from "@/lib/db/prisma";
import type {
  GoHighLevelClientOptions,
  GoHighLevelCredentials,
  GoHighLevelMessage,
  GoHighLevelDeploymentConfig,
  GoHighLevelMessageType,
} from "../../types";
import { refreshGoHighLevelToken } from "./token";
import { InputJsonValue } from "@/lib/generated/prisma/runtime/library";

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

// Check if a channel is enabled in the deployment config
export function isChannelEnabled(
  deploymentConfig: GoHighLevelDeploymentConfig,
  messageType: GoHighLevelMessageType
): boolean {
  const channels = deploymentConfig?.channels || [];
  return channels.some((ch) => ch.type === messageType && ch.active === true);
}
