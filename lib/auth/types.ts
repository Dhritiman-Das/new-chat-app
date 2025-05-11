/**
 * Common types and interfaces for the auth system
 */

// Common interfaces for OAuth credentials across providers
export interface BaseOAuthCredentials {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  scope?: string;
}

// Provider-specific credential types
export interface GoogleCredentials extends BaseOAuthCredentials {
  expiry_date: string | number;
}

export interface GoHighLevelCredentials extends BaseOAuthCredentials {
  locationId?: string;
}

export interface SlackCredentials extends BaseOAuthCredentials {
  team_id?: string;
  team_name?: string;
  bot_id?: string;
  bot_user_id?: string;
  incoming_webhook?: {
    channel?: string;
    channel_id?: string;
    configuration_url?: string;
    url?: string;
  };
}

// Context for token operations
export interface TokenContext {
  userId: string;
  credentialId?: string;
  botId?: string;
  provider: string;
}

// Provider interface - all providers must implement this
export interface OAuthProvider<T extends BaseOAuthCredentials> {
  // Get a valid access token
  getToken(context: TokenContext): Promise<string>;

  // Refresh an expired token
  refreshToken(refreshToken: string): Promise<T>;

  // Create a client instance
  createClient(credentials: T): Promise<unknown>;
}
