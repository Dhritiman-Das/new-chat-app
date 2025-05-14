/**
 * GoHighLevel OAuth provider implementation
 */

import axios from "axios";
import { GoHighLevelCredentials, OAuthProvider, TokenContext } from "../types";
import { TokenError } from "../errors";
import { getCredentials, updateCredentials } from "../utils/store";
import { needsRefresh } from "../utils/validate";
import { gohighlevelConfig } from "../config/providers-config";

export class GoHighLevelProvider
  implements OAuthProvider<GoHighLevelCredentials>
{
  /**
   * Get a valid GoHighLevel access token
   */
  async getToken(context: TokenContext): Promise<string> {
    try {
      const credentials = await this.getValidCredentials(context);
      return credentials.access_token;
    } catch (error) {
      console.error("Error getting GoHighLevel access token:", error);
      throw error;
    }
  }

  /**
   * Refresh an expired GoHighLevel token
   */
  async refreshToken(refreshToken: string): Promise<GoHighLevelCredentials> {
    try {
      // Create form data with required parameters
      const formData = new URLSearchParams();
      formData.append("client_id", gohighlevelConfig.clientId);
      formData.append("client_secret", gohighlevelConfig.clientSecret);
      formData.append("grant_type", "refresh_token");
      formData.append("refresh_token", refreshToken);
      formData.append("user_type", "Location"); // Request a Location token

      const response = await fetch(`${gohighlevelConfig.tokenEndpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new TokenError(
          `Failed to refresh token: ${errorText}`,
          "GOHIGHLEVEL_REFRESH_ERROR"
        );
      }

      const data = await response.json();

      return {
        access_token: data.access_token,
        refresh_token: data.refresh_token || refreshToken,
        expires_at: Date.now() + data.expires_in * 1000,
        scope: data.scope,
        locationId: data.locationId,
      };
    } catch (error) {
      console.error("Error refreshing GoHighLevel token:", error);
      throw error;
    }
  }

  /**
   * Create an authenticated GoHighLevel API client
   */
  async createClient(credentials: GoHighLevelCredentials) {
    // Create an axios instance for GoHighLevel API
    const client = axios.create({
      baseURL: gohighlevelConfig.apiEndpoint,
      headers: {
        Authorization: `Bearer ${credentials.access_token}`,
        Version: gohighlevelConfig.apiVersion,
        "Content-Type": "application/json",
      },
    });

    // Add response interceptor for error handling
    client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          console.error("GoHighLevel API error:", {
            status: error.response.status,
            data: error.response.data,
          });
        }
        return Promise.reject(error);
      }
    );

    return client;
  }

  /**
   * Helper method to get and refresh credentials if needed
   */
  private async getValidCredentials(
    context: TokenContext
  ): Promise<GoHighLevelCredentials> {
    const credentials = await getCredentials<GoHighLevelCredentials>(context);

    // Check if token is expired and refresh if needed
    if (credentials.refresh_token && needsRefresh(credentials)) {
      const refreshedCredentials = await this.refreshToken(
        credentials.refresh_token
      );

      // Update stored credentials
      await updateCredentials(context, {
        ...credentials,
        ...refreshedCredentials,
      });

      return {
        ...credentials,
        ...refreshedCredentials,
      };
    }

    return credentials;
  }
}

// Export an instance as the default export for dynamic importing
export default GoHighLevelProvider;
