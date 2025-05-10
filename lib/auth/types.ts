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
