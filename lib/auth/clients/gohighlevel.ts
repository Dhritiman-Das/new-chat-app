/**
 * GoHighLevel client module
 */

import { TokenContext, GoHighLevelCredentials } from "../types";
import { getProvider } from "../provider-registry";

/**
 * Create a GoHighLevel client
 */
export async function createClient(context: TokenContext) {
  try {
    // Get the provider and handle credentials
    const provider = await getProvider<GoHighLevelCredentials>("gohighlevel");

    // Get credentials
    const { getCredentials } = await import("../utils/store");
    const credentials = (await getCredentials(
      context
    )) as GoHighLevelCredentials;

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

    // Import the client factory from the main index
    const { createGoHighLevelClient } = await import("./index");
    return createGoHighLevelClient(context, credentials.locationId);
  } catch (error) {
    console.error("Error creating GoHighLevel client:", error);
    throw error;
  }
}
