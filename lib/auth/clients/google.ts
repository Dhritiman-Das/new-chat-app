/**
 * Google client module
 */

import { TokenContext } from "../types";

/**
 * Create a Google client
 */
export async function createClient(context: TokenContext) {
  try {
    // For Google, we use a different approach where the token is handled by the client factory
    // We don't need to manually handle token refresh here

    // Import the client factory
    const { createGoogleCalendarClient } = await import("./google/calendar");
    return createGoogleCalendarClient(context);
  } catch (error) {
    console.error("Error creating Google client:", error);
    throw error;
  }
}
