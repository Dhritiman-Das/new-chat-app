/**
 * Client factories for different OAuth providers
 *
 * This module provides factory functions to create clients for different providers.
 */

import { TokenContext } from "../types";
import { createClient as createBaseClient } from "../provider-registry";

// Export GoHighLevel-specific clients
export {
  GoHighLevelClient,
  createGoHighLevelClient,
  CalendarClient as GoHighLevelCalendarClient,
  MessagingClient as GoHighLevelMessagingClient,
  ContactsClient as GoHighLevelContactsClient,
} from "./gohighlevel";

// Export Google-specific clients
// Main client
export { GoogleClient, createGoogleClient } from "./google";
// Service-specific clients
export {
  CalendarClient as GoogleCalendarClient,
  createGoogleCalendarClient,
} from "./google/calendar";

/**
 * Create a client for any provider
 * This is a generic function that creates a raw client instance
 */
export async function createClient<T>(context: TokenContext): Promise<T> {
  return createBaseClient<T>(context);
}

/**
 * Create a specialized client for a specific provider and service
 */
export async function createServiceClient(
  context: TokenContext,
  service: string,
  options?: Record<string, unknown>
) {
  const { provider } = context;

  switch (provider) {
    case "gohighlevel": {
      const { createGoHighLevelClient } = await import("./gohighlevel");
      const client = createGoHighLevelClient(
        context,
        options?.locationId as string
      );

      if (service === "calendar") {
        return client.calendar;
      } else if (service === "messaging") {
        return client.messaging;
      } else if (service === "contacts") {
        return client.contacts;
      }

      return client;
    }

    case "google": {
      if (service === "calendar") {
        const { createGoogleCalendarClient } = await import(
          "./google/calendar"
        );
        return createGoogleCalendarClient(context);
      }

      throw new Error(`Google service ${service} not supported`);
    }

    default:
      throw new Error(
        `Provider ${provider} or service ${service} not supported`
      );
  }
}
