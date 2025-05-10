/**
 * Utilities for token refresh operations
 */

import { TokenContext, BaseOAuthCredentials } from "../types";
import { getCredentials, updateCredentials } from "./store";
import { needsRefresh } from "./validate";
import { TokenError } from "../errors";
import { getProvider } from "../provider-registry";

/**
 * Get and refresh token if needed
 */
export async function refreshToken<T extends BaseOAuthCredentials>(
  context: TokenContext
): Promise<T> {
  try {
    // Get stored credentials
    const credentials = await getCredentials<T>(context);

    // Check if token needs refresh
    if (credentials.refresh_token && needsRefresh(credentials)) {
      try {
        // Get the provider instance
        const provider = getProvider(context.provider);

        // Get refreshed credentials
        const refreshedCredentials = await provider.refreshToken(
          credentials.refresh_token
        );

        // Update credentials in database
        await updateCredentials(context, {
          ...credentials,
          ...refreshedCredentials,
        } as T);

        // Return refreshed credentials
        return {
          ...credentials,
          ...refreshedCredentials,
        } as T;
      } catch (error) {
        console.error(`Token refresh failed for ${context.provider}:`, error);
        throw new TokenError(
          `Failed to refresh token: ${
            error instanceof Error ? error.message : String(error)
          }`,
          `${context.provider.toUpperCase()}_REFRESH_ERROR`
        );
      }
    }

    // Return existing credentials if no refresh needed
    return credentials;
  } catch (error) {
    console.error(`Error in refreshToken for ${context.provider}:`, error);
    throw error;
  }
}
