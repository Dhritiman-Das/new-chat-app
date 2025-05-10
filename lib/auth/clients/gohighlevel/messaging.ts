/**
 * GoHighLevel Messaging Client
 */

import { ProviderError } from "../../errors";
import { GoHighLevelClient } from "./index";

// Types for messaging
export type MessageType =
  | "SMS"
  | "Email"
  | "WhatsApp"
  | "IG"
  | "FB"
  | "Custom"
  | "Live_Chat"
  | "CALL";

export interface Message {
  type: MessageType;
  contactId: string;
  message: string;
  conversationId?: string;
  html?: string;
  subject?: string; // For email
  attachments?: string[];
  fromNumber?: string;
  toNumber?: string;
  conversationProviderId?: string;
  // Email specific fields
  emailFrom?: string;
  emailTo?: string;
  emailCc?: string[];
  emailBcc?: string[];
  [key: string]: unknown;
}

export class MessagingClient {
  private parent: GoHighLevelClient;
  private locationId?: string;

  constructor(parent: GoHighLevelClient, locationId?: string) {
    this.parent = parent;
    this.locationId = locationId;
  }

  /**
   * Send a message to a contact
   */
  async sendMessage(message: Message) {
    try {
      const client = await this.parent.getClient();

      // Add locationId if available and not already in the message
      const messageToSend = {
        ...message,
        locationId: message.locationId || this.locationId,
      };

      const response = await client.post(
        "/conversations/messages",
        messageToSend
      );

      return {
        success: true,
        messageId: response.data.messageId,
        conversationId: response.data.conversationId,
      };
    } catch (error) {
      console.error("Error sending GoHighLevel message:", error);
      throw new ProviderError(
        `Failed to send message: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "gohighlevel",
        "MESSAGE_SEND_ERROR"
      );
    }
  }

  /**
   * Get conversations for a contact
   */
  async getConversations(contactId: string, limit = 10, offset = 0) {
    try {
      const client = await this.parent.getClient();

      // Build query parameters
      const params = new URLSearchParams();
      params.append("contactId", contactId);
      params.append("limit", limit.toString());
      params.append("offset", offset.toString());

      if (this.locationId) {
        params.append("locationId", this.locationId);
      }

      const response = await client.get(`/conversations?${params.toString()}`);

      return response.data.conversations || [];
    } catch (error) {
      console.error("Error fetching GoHighLevel conversations:", error);
      throw new ProviderError(
        `Failed to fetch conversations: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "gohighlevel",
        "CONVERSATIONS_FETCH_ERROR"
      );
    }
  }

  /**
   * Get messages for a conversation
   */
  async getMessages(conversationId: string, limit = 20, offset = 0) {
    try {
      const client = await this.parent.getClient();

      // Build query parameters
      const params = new URLSearchParams();
      params.append("limit", limit.toString());
      params.append("offset", offset.toString());

      if (this.locationId) {
        params.append("locationId", this.locationId);
      }

      const response = await client.get(
        `/conversations/${conversationId}/messages?${params.toString()}`
      );

      return response.data.messages || [];
    } catch (error) {
      console.error("Error fetching GoHighLevel messages:", error);
      throw new ProviderError(
        `Failed to fetch messages: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "gohighlevel",
        "MESSAGES_FETCH_ERROR"
      );
    }
  }
}
