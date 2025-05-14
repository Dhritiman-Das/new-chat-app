/**
 * Slack client module
 */

import { TokenContext, SlackCredentials } from "../types";
import { getProvider } from "../provider-registry";

/**
 * Create a Slack client
 */
export async function createClient(context: TokenContext) {
  try {
    // Get the provider
    const provider = await getProvider<SlackCredentials>("slack");

    // Get credentials
    const { getCredentials } = await import("../utils/store");
    const credentials = (await getCredentials(context)) as SlackCredentials;

    // Handle token refresh if needed
    const { needsRefresh } = await import("../utils/validate");
    if (credentials.refresh_token && needsRefresh(credentials)) {
      const refreshedCredentials = await provider.refreshToken(
        credentials.refresh_token
      );

      // Update stored credentials
      const { updateCredentials } = await import("../utils/store");
      await updateCredentials(context, {
        ...credentials,
        ...refreshedCredentials,
      });

      // Use refreshed credentials
      Object.assign(credentials, refreshedCredentials);
    }

    // Create and return client
    return provider.createClient(credentials);
  } catch (error) {
    console.error("Error creating Slack client:", error);
    throw error;
  }
}
