/**
 * Provider registry for managing OAuth providers
 */

import { OAuthProvider, TokenContext, BaseOAuthCredentials } from "./types";
import { ProviderError } from "./errors";
import { needsRefresh } from "./utils/validate";

// Provider registry map
const providerRegistry: Record<
  string,
  OAuthProvider<BaseOAuthCredentials>
> = {};

/**
 * Register a provider implementation
 */
export function registerProvider(
  name: string,
  provider: OAuthProvider<BaseOAuthCredentials>
): void {
  providerRegistry[name] = provider;
}

/**
 * Dynamically load a provider implementation
 */
async function loadProvider(
  providerName: string
): Promise<OAuthProvider<BaseOAuthCredentials>> {
  // Check if provider is already registered
  if (providerRegistry[providerName]) {
    return providerRegistry[providerName];
  }

  try {
    // Dynamically import the provider module
    const { default: ProviderClass } = await import(
      `./providers/${providerName}`
    );
    const provider = new ProviderClass();

    // Register the provider for future use
    registerProvider(providerName, provider);

    return provider;
  } catch {
    throw new ProviderError(
      `Provider ${providerName} not supported or could not be loaded`,
      providerName,
      "PROVIDER_NOT_SUPPORTED"
    );
  }
}

/**
 * Get a provider instance by name
 */
export async function getProvider<T extends BaseOAuthCredentials>(
  providerName: string
): Promise<OAuthProvider<T>> {
  try {
    const provider = await loadProvider(providerName);
    return provider as OAuthProvider<T>;
  } catch {
    throw new ProviderError(
      `Provider ${providerName} not supported`,
      providerName,
      "PROVIDER_NOT_SUPPORTED"
    );
  }
}

/**
 * Helper method to get a token for a provider
 */
export async function getToken(context: TokenContext): Promise<string> {
  const provider = await getProvider(context.provider);
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
 * Get credentials for a provider
 */
async function getCredentials(
  context: TokenContext
): Promise<BaseOAuthCredentials> {
  const { getCredentials: getCredentialsFromStore } = await import(
    "./utils/store"
  );
  return getCredentialsFromStore(context);
}

/**
 * Helper method to create an authenticated client
 */
export async function createClient<T>(context: TokenContext): Promise<T> {
  try {
    const { provider } = context;

    // Dynamically import the client module
    try {
      const clientModule = await import(`./clients/${provider}`);
      if (typeof clientModule.createClient === "function") {
        return clientModule.createClient(context) as T;
      }
    } catch {
      // If specific client module doesn't exist or doesn't export createClient,
      // fall back to the generic approach
    }

    // Generic approach for providers without specialized client modules
    const providerInstance = await getProvider<BaseOAuthCredentials>(provider);
    let credentials = await getCredentials(context);

    // Refresh token if needed
    credentials = await refreshTokenIfNeeded(
      context,
      credentials,
      providerInstance
    );

    return providerInstance.createClient(credentials) as unknown as T;
  } catch (error) {
    console.error(
      `Error creating client for provider ${context.provider}:`,
      error
    );
    throw error;
  }
}
