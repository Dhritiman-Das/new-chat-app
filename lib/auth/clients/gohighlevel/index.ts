/**
 * GoHighLevel client implementation
 */

import type { AxiosInstance } from "axios";
import { TokenContext } from "../../types";
import { CalendarClient } from "./calendar";
import { ContactsClient } from "./contacts";
import { MessagingClient } from "./messaging";
import { LocationClient } from "./location";

/**
 * GoHighLevel client class
 */
export class GoHighLevelClient {
  public axios: AxiosInstance;
  public calendar: CalendarClient;
  public contacts: ContactsClient;
  public messaging: MessagingClient;
  public location: LocationClient;

  constructor(axios: AxiosInstance, locationId?: string) {
    this.axios = axios;
    const getClient = async (): Promise<AxiosInstance> => this.axios;
    this.calendar = new CalendarClient(
      { getClient, axios: this.axios } as GoHighLevelClient,
      locationId
    );
    this.contacts = new ContactsClient(
      { getClient, axios: this.axios } as GoHighLevelClient,
      locationId
    );
    this.messaging = new MessagingClient(
      { getClient, axios: this.axios } as GoHighLevelClient,
      locationId
    );
    this.location = new LocationClient(getClient, locationId);
  }

  getClient = async (): Promise<AxiosInstance> => this.axios;
}

/**
 * Create a GoHighLevel client
 */
export async function createGoHighLevelClient(
  context: TokenContext,
  locationId?: string
): Promise<GoHighLevelClient> {
  try {
    // Get the provider and handle credentials with refresh logic
    const { getProvider } = await import("../../provider-registry");
    const provider = await getProvider<
      import("../../types").GoHighLevelCredentials
    >("gohighlevel");

    const { getCredentials, updateCredentials } = await import(
      "../../utils/store"
    );
    const { needsRefresh } = await import("../../utils/validate");

    let credentials = await getCredentials(context);

    // Handle token refresh if needed
    if (credentials.refresh_token && needsRefresh(credentials)) {
      const refreshedCredentials = await provider.refreshToken(
        credentials.refresh_token
      );

      // Update stored credentials
      await updateCredentials(context, {
        ...credentials,
        ...refreshedCredentials,
      });

      // Use refreshed credentials
      credentials = {
        ...credentials,
        ...refreshedCredentials,
      };
    }

    // Create the raw axios client using the provider's createClient
    const axiosClient = (await provider.createClient(
      credentials
    )) as AxiosInstance;

    return new GoHighLevelClient(axiosClient, locationId);
  } catch (error) {
    console.error("Error creating GoHighLevel client:", error);
    throw error;
  }
}
