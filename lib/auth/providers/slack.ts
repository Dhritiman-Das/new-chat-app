/**
 * Slack OAuth provider implementation
 */

import { App } from "@slack/bolt";
import { OAuthProvider, SlackCredentials, TokenContext } from "../types";
import { TokenError } from "../errors";
import { getCredentials, updateCredentials } from "../utils/store";
import { needsRefresh } from "../utils/validate";
import { slackConfig } from "../config/providers-config";

export class SlackProvider implements OAuthProvider<SlackCredentials> {
  /**
   * Get a valid Slack access token
   */
  async getToken(context: TokenContext): Promise<string> {
    try {
      const credentials = await this.getValidCredentials(context);
      return credentials.access_token;
    } catch (error) {
      console.error("Error getting Slack access token:", error);
      throw error;
    }
  }

  /**
   * Refresh an expired Slack token
   * Note: Slack tokens don't expire by default, but this is implemented
   * to satisfy the OAuthProvider interface
   */
  async refreshToken(refreshToken: string): Promise<SlackCredentials> {
    try {
      const response = await fetch(slackConfig.tokenEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: slackConfig.clientId,
          client_secret: slackConfig.clientSecret,
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }).toString(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new TokenError(
          `Failed to refresh token: ${
            errorData.error_description || errorData.error
          }`,
          "SLACK_REFRESH_ERROR"
        );
      }

      const data = await response.json();

      // Return the updated credentials
      return {
        access_token: data.access_token,
        refresh_token: data.refresh_token || refreshToken,
        expires_at: data.expires_in
          ? Date.now() + data.expires_in * 1000
          : undefined,
        scope: data.scope,
        team_id: data.team.id,
        team_name: data.team.name,
        bot_id: data.bot_id,
        bot_user_id: data.bot_user_id,
        incoming_webhook: data.incoming_webhook,
      };
    } catch (error) {
      console.error("Error refreshing Slack token:", error);
      throw error;
    }
  }

  /**
   * Create an authenticated Slack API client
   */
  async createClient(credentials: SlackCredentials) {
    // Create a new Slack App instance
    const slackApp = new App({
      token: credentials.access_token,
      signingSecret: slackConfig.signingSecret,
    });

    return slackApp;
  }

  /**
   * Helper method to get and refresh credentials if needed
   */
  private async getValidCredentials(
    context: TokenContext
  ): Promise<SlackCredentials> {
    const credentials = await getCredentials<SlackCredentials>(context);

    // Check if token is expired and refresh if needed
    if (
      credentials.refresh_token &&
      credentials.expires_at &&
      needsRefresh(credentials)
    ) {
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
