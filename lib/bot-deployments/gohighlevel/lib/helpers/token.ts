import { gohighlevelConfig } from "../../config";
import type { GoHighLevelCredentials } from "../../types";

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
