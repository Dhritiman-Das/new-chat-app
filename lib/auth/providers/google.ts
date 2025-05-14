/**
 * Google OAuth provider implementation
 */

import { google } from "googleapis";
import { GoogleCredentials, OAuthProvider, TokenContext } from "../types";
import { TokenError } from "../errors";
import { getCredentials, updateCredentials } from "../utils/store";
import { needsRefresh } from "../utils/validate";
import { googleConfig } from "../config/providers-config";

export class GoogleProvider implements OAuthProvider<GoogleCredentials> {
  /**
   * Get a valid Google access token
   */
  async getToken(context: TokenContext): Promise<string> {
    try {
      const credentials = await this.getValidCredentials(context);
      return credentials.access_token;
    } catch (error) {
      console.error("Error getting Google access token:", error);
      throw error;
    }
  }

  /**
   * Refresh an expired Google token
   */
  async refreshToken(refreshToken: string): Promise<GoogleCredentials> {
    try {
      const response = await fetch(googleConfig.tokenEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: googleConfig.clientId,
          client_secret: googleConfig.clientSecret,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
        }).toString(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new TokenError(
          `Failed to refresh token: ${
            errorData.error_description || errorData.error
          }`,
          "GOOGLE_REFRESH_ERROR"
        );
      }

      const tokens = await response.json();

      // Calculate expiryDate for Google API compatibility
      const expiryDate = Date.now() + tokens.expires_in * 1000;

      return {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || refreshToken, // Keep old refresh token if not provided
        expiry_date: expiryDate,
        expires_at: expiryDate, // Add expires_at for our internal validation
        scope: tokens.scope || "",
      };
    } catch (error) {
      console.error("Error refreshing Google token:", error);
      throw error;
    }
  }

  /**
   * Create an authenticated Google API client
   */
  async createClient(credentials: GoogleCredentials) {
    // Create an OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      googleConfig.clientId,
      googleConfig.clientSecret,
      googleConfig.redirectUri
    );

    // Set credentials
    oauth2Client.setCredentials({
      access_token: credentials.access_token,
      refresh_token: credentials.refresh_token,
      expiry_date:
        typeof credentials.expiry_date === "string"
          ? new Date(credentials.expiry_date).getTime()
          : credentials.expiry_date,
    });

    return oauth2Client;
  }

  /**
   * Helper method to get and refresh credentials if needed
   */
  private async getValidCredentials(
    context: TokenContext
  ): Promise<GoogleCredentials> {
    const credentials = await getCredentials<GoogleCredentials>(context);

    // If expires_at is missing but expiry_date exists, set expires_at
    if (!credentials.expires_at && credentials.expiry_date) {
      credentials.expires_at =
        typeof credentials.expiry_date === "string"
          ? new Date(credentials.expiry_date).getTime()
          : credentials.expiry_date;
    }

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
export default GoogleProvider;
