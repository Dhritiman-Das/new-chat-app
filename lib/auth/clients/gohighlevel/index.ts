/**
 * GoHighLevel client
 *
 * This client provides access to the GoHighLevel API.
 */

import { AxiosInstance } from "axios";
import { TokenContext } from "../../types";
import { getProvider } from "../../provider-registry";
import { ContactsClient } from "./contacts";
import { CalendarClient } from "./calendar";
import { MessagingClient } from "./messaging";
import { LocationClient } from "./location";
import { getCredentials } from "../../utils/store";

export class GoHighLevelClient {
  private client: AxiosInstance | null = null;
  private context: TokenContext;
  private locationId?: string;

  // Service clients
  private _calendar: CalendarClient | null = null;
  private _messaging: MessagingClient | null = null;
  private _contacts: ContactsClient | null = null;
  private _location: LocationClient | null = null;

  constructor(context: TokenContext, locationId?: string) {
    this.context = context;
    this.locationId = locationId;
  }

  /**
   * Initialize the client
   */
  async initialize(): Promise<void> {
    // Get provider directly instead of using createClient to avoid circular dependency
    const provider = getProvider(this.context.provider);
    const credentials = await getCredentials(this.context);
    this.client = (await provider.createClient(credentials)) as AxiosInstance;
  }

  /**
   * Get the base client instance
   */
  async getClient(): Promise<AxiosInstance> {
    if (!this.client) {
      await this.initialize();
    }
    return this.client as AxiosInstance;
  }

  /**
   * Get the calendar service client
   */
  get calendar(): CalendarClient {
    if (!this._calendar) {
      this._calendar = new CalendarClient(this, this.locationId);
    }
    return this._calendar;
  }

  /**
   * Get the messaging service client
   */
  get messaging(): MessagingClient {
    if (!this._messaging) {
      this._messaging = new MessagingClient(this, this.locationId);
    }
    return this._messaging;
  }

  /**
   * Get the contacts service client
   */
  get contacts(): ContactsClient {
    if (!this._contacts) {
      this._contacts = new ContactsClient(this, this.locationId);
    }
    return this._contacts;
  }

  /**
   * Get the location service client
   */
  get location(): LocationClient {
    if (!this._location) {
      this._location = new LocationClient(
        () => this.getClient(),
        this.locationId
      );
    }
    return this._location;
  }
}

// Export sub-clients
export { CalendarClient };
export { MessagingClient };
export { ContactsClient };
export { LocationClient };

// Factory function to create a client
export function createGoHighLevelClient(
  context: TokenContext,
  locationId?: string
): GoHighLevelClient {
  const client = new GoHighLevelClient(context, locationId);
  // Initialize immediately to ensure it's ready
  void client.initialize();
  return client;
}
