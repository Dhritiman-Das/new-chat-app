/**
 * Client factories for different OAuth providers
 *
 * This module provides factory functions to create clients for different providers.
 */

import { TokenContext } from "../types";
import { createClient as createBaseClient } from "../provider-registry";

// Export GoHighLevel-specific clients
export type { GoHighLevelClient } from "./gohighlevel/index";
export { createGoHighLevelClient } from "./gohighlevel/index";

export type { CalendarClient as GoHighLevelCalendarClient } from "./gohighlevel/calendar";
export type { MessagingClient as GoHighLevelMessagingClient } from "./gohighlevel/messaging";
export type { ContactsClient as GoHighLevelContactsClient } from "./gohighlevel/contacts";

// Google calendar client
export {
  CalendarClient as GoogleCalendarClient,
  createGoogleCalendarClient,
} from "./google/calendar";

// Export Slack client
export { SlackClient, createSlackClient } from "./slack/index";
export type { SlackClientOptions } from "./slack/index";

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
      const { createGoHighLevelClient } = await import("./gohighlevel/index");
      const client = createGoHighLevelClient(
        context,
        options?.locationId as string
      );

      if (service === "calendar") {
        return (await client).calendar;
      } else if (service === "messaging") {
        return (await client).messaging;
      } else if (service === "contacts") {
        return (await client).contacts;
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

      // Default to using the provider registry
      return createBaseClient(context);
    }

    case "slack": {
      // Use the provider registry for slack clients
      return createBaseClient({
        ...context,
        provider: "slack",
      });
    }

    default:
      throw new Error(
        `Provider ${provider} or service ${service} not supported`
      );
  }
}
