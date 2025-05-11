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
 * Helper method to create an authenticated client
 */
export async function createClient<T>(context: TokenContext): Promise<T> {
  if (context.provider === "gohighlevel") {
    // Handle GoHighLevel specially using dynamic import to avoid circular dependencies
    try {
      const credentials = (await getCredentials(
        context
      )) as GoHighLevelCredentials;
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
      // Dynamically import the Google client
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
      const credentials = (await getCredentials(context)) as SlackCredentials;
      const provider = getProvider<SlackCredentials>("slack");
      return provider.createClient(credentials) as unknown as T;
    } catch (error) {
      console.error("Error creating Slack client:", error);
      throw error;
    }
  }

  // For other providers, use the standard approach
  const provider = getProvider<BaseOAuthCredentials>(context.provider);
  const credentials = await getCredentials(context);
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
