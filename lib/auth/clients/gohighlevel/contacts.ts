/**
 * GoHighLevel Contacts Client
 */

import { ProviderError } from "../../errors";
import { GoHighLevelClient } from "./index";

export interface ContactFields {
  email?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  phone?: string;
  address1?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  companyName?: string;
  tags?: string[];
  source?: string;
  customFields?: Record<string, string | number | boolean>;
  [key: string]: unknown;
}

export class ContactsClient {
  private parent: GoHighLevelClient;
  private locationId?: string;

  constructor(parent: GoHighLevelClient, locationId?: string) {
    this.parent = parent;
    this.locationId = locationId;
  }

  /**
   * Search for contacts
   */
  async searchContacts(query: string, limit = 10, offset = 0) {
    try {
      const client = await this.parent.getClient();

      // Build query parameters
      const params = new URLSearchParams();
      params.append("query", query);
      params.append("limit", limit.toString());
      params.append("offset", offset.toString());

      if (this.locationId) {
        params.append("locationId", this.locationId);
      }

      const response = await client.get(
        `/contacts/search?${params.toString()}`
      );

      return response.data.contacts || [];
    } catch (error) {
      console.error("Error searching GoHighLevel contacts:", error);
      throw new ProviderError(
        `Failed to search contacts: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "gohighlevel",
        "CONTACTS_SEARCH_ERROR"
      );
    }
  }

  /**
   * Get a contact by ID
   */
  async getContact(contactId: string) {
    try {
      const client = await this.parent.getClient();

      // Build query parameters
      const params = new URLSearchParams();

      if (this.locationId) {
        params.append("locationId", this.locationId);
      }

      const response = await client.get(
        `/contacts/${contactId}?${params.toString()}`
      );

      return response.data;
    } catch (error) {
      console.error("Error fetching GoHighLevel contact:", error);
      throw new ProviderError(
        `Failed to fetch contact: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "gohighlevel",
        "CONTACT_FETCH_ERROR"
      );
    }
  }

  /**
   * Create a new contact
   */
  async createContact(contactData: ContactFields) {
    try {
      const client = await this.parent.getClient();

      // Ensure we have a locationId for the contact
      const payload = {
        ...contactData,
        locationId: contactData.locationId || this.locationId,
      };

      const response = await client.post("/contacts", payload);

      return response.data;
    } catch (error) {
      console.error("Error creating GoHighLevel contact:", error);
      throw new ProviderError(
        `Failed to create contact: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "gohighlevel",
        "CONTACT_CREATE_ERROR"
      );
    }
  }

  /**
   * Update a contact
   */
  async updateContact(contactId: string, contactData: ContactFields) {
    try {
      const client = await this.parent.getClient();

      // Ensure we have a locationId for the contact
      const payload = {
        ...contactData,
        locationId: contactData.locationId || this.locationId,
      };

      const response = await client.put(`/contacts/${contactId}`, payload);

      return response.data;
    } catch (error) {
      console.error("Error updating GoHighLevel contact:", error);
      throw new ProviderError(
        `Failed to update contact: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "gohighlevel",
        "CONTACT_UPDATE_ERROR"
      );
    }
  }

  /**
   * Add tags to a contact
   */
  async addTags(contactId: string, tags: string[]) {
    try {
      const client = await this.parent.getClient();

      const payload = {
        tags,
        locationId: this.locationId,
      };

      const response = await client.post(
        `/contacts/${contactId}/tags`,
        payload
      );

      return response.data;
    } catch (error) {
      console.error("Error adding tags to GoHighLevel contact:", error);
      throw new ProviderError(
        `Failed to add tags: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "gohighlevel",
        "CONTACT_ADD_TAGS_ERROR"
      );
    }
  }
}
