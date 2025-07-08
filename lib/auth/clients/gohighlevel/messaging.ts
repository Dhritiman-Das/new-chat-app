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

// GoHighLevel API message types
export type GoHighLevelMessageType =
  | "TYPE_CALL"
  | "TYPE_SMS"
  | "TYPE_EMAIL"
  | "TYPE_SMS_REVIEW_REQUEST"
  | "TYPE_WEBCHAT"
  | "TYPE_SMS_NO_SHOW_REQUEST"
  | "TYPE_CAMPAIGN_SMS"
  | "TYPE_CAMPAIGN_CALL"
  | "TYPE_CAMPAIGN_EMAIL"
  | "TYPE_CAMPAIGN_VOICEMAIL"
  | "TYPE_FACEBOOK"
  | "TYPE_CAMPAIGN_FACEBOOK"
  | "TYPE_CAMPAIGN_MANUAL_CALL"
  | "TYPE_CAMPAIGN_MANUAL_SMS"
  | "TYPE_GMB"
  | "TYPE_CAMPAIGN_GMB"
  | "TYPE_REVIEW"
  | "TYPE_INSTAGRAM"
  | "TYPE_WHATSAPP"
  | "TYPE_CUSTOM_SMS"
  | "TYPE_CUSTOM_EMAIL"
  | "TYPE_CUSTOM_PROVIDER_SMS"
  | "TYPE_CUSTOM_PROVIDER_EMAIL"
  | "TYPE_IVR_CALL"
  | "TYPE_ACTIVITY_CONTACT"
  | "TYPE_ACTIVITY_INVOICE"
  | "TYPE_ACTIVITY_PAYMENT"
  | "TYPE_ACTIVITY_OPPORTUNITY"
  | "TYPE_LIVE_CHAT"
  | "TYPE_LIVE_CHAT_INFO_MESSAGE"
  | "TYPE_ACTIVITY_APPOINTMENT"
  | "TYPE_FACEBOOK_COMMENT"
  | "TYPE_INSTAGRAM_COMMENT"
  | "TYPE_CUSTOM_CALL"
  | "TYPE_INTERNAL_COMMENT";

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

export interface ConversationSearchResult {
  id: string;
  contactId: string;
  locationId: string;
  lastMessageBody: string;
  lastMessageType: GoHighLevelMessageType;
  type: string;
  unreadCount: number;
  fullName: string;
  contactName: string;
  email: string;
  phone: string;
}

export interface ConversationSearchResponse {
  conversations: ConversationSearchResult[];
  total: number;
}

/**
 * Map GoHighLevel message types to our MessageType enum
 */
export function mapGoHighLevelMessageType(
  ghlType: GoHighLevelMessageType
): MessageType {
  const typeMap: Record<GoHighLevelMessageType, MessageType> = {
    TYPE_SMS: "SMS",
    TYPE_CUSTOM_SMS: "SMS",
    TYPE_CAMPAIGN_SMS: "SMS",
    TYPE_CAMPAIGN_MANUAL_SMS: "SMS",
    TYPE_SMS_REVIEW_REQUEST: "SMS",
    TYPE_SMS_NO_SHOW_REQUEST: "SMS",
    TYPE_CUSTOM_PROVIDER_SMS: "SMS",

    TYPE_EMAIL: "Email",
    TYPE_CUSTOM_EMAIL: "Email",
    TYPE_CAMPAIGN_EMAIL: "Email",
    TYPE_CUSTOM_PROVIDER_EMAIL: "Email",

    TYPE_FACEBOOK: "FB",
    TYPE_CAMPAIGN_FACEBOOK: "FB",
    TYPE_FACEBOOK_COMMENT: "FB",

    TYPE_INSTAGRAM: "IG",
    TYPE_INSTAGRAM_COMMENT: "IG",

    TYPE_WHATSAPP: "WhatsApp",

    TYPE_LIVE_CHAT: "Live_Chat",
    TYPE_LIVE_CHAT_INFO_MESSAGE: "Live_Chat",
    TYPE_WEBCHAT: "Live_Chat",

    TYPE_CALL: "CALL",
    TYPE_CAMPAIGN_CALL: "CALL",
    TYPE_CAMPAIGN_MANUAL_CALL: "CALL",
    TYPE_IVR_CALL: "CALL",
    TYPE_CUSTOM_CALL: "CALL",

    // All other types map to Custom
    TYPE_CAMPAIGN_VOICEMAIL: "Custom",
    TYPE_GMB: "Custom",
    TYPE_CAMPAIGN_GMB: "Custom",
    TYPE_REVIEW: "Custom",
    TYPE_ACTIVITY_CONTACT: "Custom",
    TYPE_ACTIVITY_INVOICE: "Custom",
    TYPE_ACTIVITY_PAYMENT: "Custom",
    TYPE_ACTIVITY_OPPORTUNITY: "Custom",
    TYPE_ACTIVITY_APPOINTMENT: "Custom",
    TYPE_INTERNAL_COMMENT: "Custom",
  };

  return typeMap[ghlType] || "Custom";
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
   * Search conversations
   * Endpoint: GET /conversations/search
   *
   * @param options - Search options including contactId, query, filters, etc.
   * @returns Promise resolving to conversation search results
   * @throws ProviderError if the request fails or locationId is missing
   */
  async searchConversations(
    options: {
      contactId?: string;
      assignedTo?: string;
      followers?: string;
      id?: string;
      lastMessageAction?: "automated" | "manual";
      lastMessageDirection?: "inbound" | "outbound";
      lastMessageType?: GoHighLevelMessageType;
      limit?: number;
      mentions?: string;
      query?: string;
      scoreProfile?: string;
      scoreProfileMax?: number;
      scoreProfileMin?: number;
      sort?: "asc" | "desc";
      sortBy?:
        | "last_manual_message_date"
        | "last_message_date"
        | "score_profile";
      sortScoreProfile?: string;
      startAfterDate?: number | string;
      status?: "all" | "read" | "unread" | "starred" | "recents";
    } = {}
  ): Promise<ConversationSearchResponse> {
    try {
      const client = await this.parent.getClient();

      if (!this.locationId) {
        throw new ProviderError(
          "Location ID is required to search conversations",
          "gohighlevel",
          "MISSING_LOCATION_ID"
        );
      }

      // Build query parameters
      const params = new URLSearchParams();
      params.append("locationId", this.locationId);

      // Add optional parameters
      if (options.contactId) params.append("contactId", options.contactId);
      if (options.assignedTo) params.append("assignedTo", options.assignedTo);
      if (options.followers) params.append("followers", options.followers);
      if (options.id) params.append("id", options.id);
      if (options.lastMessageAction)
        params.append("lastMessageAction", options.lastMessageAction);
      if (options.lastMessageDirection)
        params.append("lastMessageDirection", options.lastMessageDirection);
      if (options.lastMessageType)
        params.append("lastMessageType", options.lastMessageType);
      if (options.limit) params.append("limit", options.limit.toString());
      if (options.mentions) params.append("mentions", options.mentions);
      if (options.query) params.append("query", options.query);
      if (options.scoreProfile)
        params.append("scoreProfile", options.scoreProfile);
      if (options.scoreProfileMax)
        params.append("scoreProfileMax", options.scoreProfileMax.toString());
      if (options.scoreProfileMin)
        params.append("scoreProfileMin", options.scoreProfileMin.toString());
      if (options.sort) params.append("sort", options.sort);
      if (options.sortBy) params.append("sortBy", options.sortBy);
      if (options.sortScoreProfile)
        params.append("sortScoreProfile", options.sortScoreProfile);
      if (options.startAfterDate)
        params.append("startAfterDate", options.startAfterDate.toString());
      if (options.status) params.append("status", options.status);

      const response = await client.get(
        `/conversations/search?${params.toString()}`
      );

      return {
        conversations: response.data.conversations || [],
        total: response.data.total || 0,
      };
    } catch (error) {
      console.error("Error searching GoHighLevel conversations:", error);
      throw new ProviderError(
        `Failed to search conversations: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "gohighlevel",
        "CONVERSATIONS_SEARCH_ERROR"
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

      return response.data.messages.messages || [];
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
