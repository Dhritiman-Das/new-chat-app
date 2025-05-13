/**
 * Provider registry for managing OAuth providers
 */

import {
  OAuthProvider,
  TokenContext,
  BaseOAuthCredentials,
  GoHighLevelCredentials,
  SlackCredentials,
} from "./types";
import { GoHighLevelProvider } from "./providers/gohighlevel";
import { GoogleProvider } from "./providers/google";
import { SlackProvider } from "./providers/slack";
import { ProviderError } from "./errors";
import { getCredentials as getCredentialsFromStore } from "./utils/store";
import { needsRefresh } from "./utils/validate";

// Map of provider types to their implementation classes
const providers: Record<string, OAuthProvider<BaseOAuthCredentials>> = {
  gohighlevel: new GoHighLevelProvider(),
  google: new GoogleProvider(),
  slack: new SlackProvider(),
};

/**
 * Get a provider instance by name
 */
export function getProvider<T extends BaseOAuthCredentials>(
  provider: string
): OAuthProvider<T> {
  if (!providers[provider]) {
    throw new ProviderError(
      `Provider ${provider} not supported`,
      provider,
      "PROVIDER_NOT_SUPPORTED"
    );
  }

  return providers[provider] as OAuthProvider<T>;
}

/**
 * Helper method to get a token for a provider
 */
export async function getToken(context: TokenContext): Promise<string> {
  const provider = getProvider(context.provider);
  return provider.getToken(context);
}

/**
 * Helper method to refresh token if needed
 */
async function refreshTokenIfNeeded<T extends BaseOAuthCredentials>(
  context: TokenContext,
  credentials: T,
  provider: OAuthProvider<T>
): Promise<T> {
  if (credentials.refresh_token && needsRefresh(credentials)) {
    const refreshedCredentials = await provider.refreshToken(
      credentials.refresh_token
    );

    // Update stored credentials
    const { updateCredentials } = await import("./utils/store");
    await updateCredentials(context, {
      ...credentials,
      ...refreshedCredentials,
    });

    // Return the refreshed credentials
    return {
      ...credentials,
      ...refreshedCredentials,
    };
  }

  return credentials;
}

/**
 * Helper method to create an authenticated client
 */
export async function createClient<T>(context: TokenContext): Promise<T> {
  if (context.provider === "gohighlevel") {
    // Handle GoHighLevel specially using dynamic import to avoid circular dependencies
    try {
      // First get the provider to handle token refresh
      const provider = getProvider<GoHighLevelCredentials>("gohighlevel");

      // Get credentials first - we don't use getValidCredentials directly to avoid circular dependencies
      let credentials = (await getCredentials(
        context
      )) as GoHighLevelCredentials;

      // Check if token needs refresh and refresh if necessary
      credentials = await refreshTokenIfNeeded(context, credentials, provider);

      // Dynamically import the GoHighLevel client
      const { createGoHighLevelClient } = await import("./clients/gohighlevel");
      return createGoHighLevelClient(
        context,
        credentials.locationId
      ) as unknown as T;
    } catch (error) {
      console.error("Error creating GoHighLevel client:", error);
      throw error;
    }
  } else if (context.provider === "google") {
    // Handle Google specially to create the appropriate client
    try {
      // For Google, we don't need to handle credentials directly
      // Just use getToken which already handles token refresh
      const { createGoogleCalendarClient } = await import(
        "./clients/google/calendar"
      );
      return createGoogleCalendarClient(context) as unknown as T;
    } catch (error) {
      console.error("Error creating Google client:", error);
      throw error;
    }
  } else if (context.provider === "slack") {
    // Handle Slack specially
    try {
      const provider = getProvider<SlackCredentials>("slack");
      let credentials = (await getCredentials(context)) as SlackCredentials;

      // Refresh token if needed
      credentials = await refreshTokenIfNeeded(context, credentials, provider);

      return provider.createClient(credentials) as unknown as T;
    } catch (error) {
      console.error("Error creating Slack client:", error);
      throw error;
    }
  }

  // For other providers, use the standard approach
  const provider = getProvider<BaseOAuthCredentials>(context.provider);
  let credentials = await getCredentials(context);

  // Refresh token if needed
  credentials = await refreshTokenIfNeeded(context, credentials, provider);

  return provider.createClient(credentials) as unknown as T;
}

// Helper function to get credentials
async function getCredentials(
  context: TokenContext
): Promise<BaseOAuthCredentials> {
  // We need to import this to avoid circular dependency issues
  return getCredentialsFromStore(context);
}

/**
 * Register a new provider
 */
export function registerProvider(
  name: string,
  provider: OAuthProvider<BaseOAuthCredentials>
): void {
  providers[name] = provider;
}
