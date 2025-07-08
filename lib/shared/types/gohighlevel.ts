/**
 * Shared GoHighLevel Types
 *
 * This file contains types that are shared between the auth module and bot deployments,
 * to reduce duplication and improve consistency.
 */

/**
 * Supported message types in GoHighLevel
 */
export type GoHighLevelMessageType =
  | "SMS"
  | "Email"
  | "WhatsApp"
  | "IG"
  | "FB"
  | "Custom" // Voicemail
  | "Live_Chat"
  | "CALL";

/**
 * Channel configuration for deployment
 */
export interface GoHighLevelChannel {
  type: GoHighLevelMessageType;
  active: boolean;
  settings?: {
    [key: string]: unknown;
  };
}

/**
 * Global settings for the deployment
 */
export interface GoHighLevelGlobalSettings {
  checkKillSwitch?: boolean;
  defaultResponseTime?: string;
  accessCode?: string; // Optional access code to filter messages
  reEngage?: {
    enabled: boolean;
    noShowTag: string; // Default: "no-show"
    timeLimit: string; // e.g., "1h", "30m", "2d" - when to re-engage after tag is added
    manualMessage?: string; // If empty, bot will auto-generate
    type: "no_show" | "unresponsive_message"; // Extensible for future types
  };
  [key: string]: unknown;
}

/**
 * Complete deployment configuration
 */
export interface GoHighLevelDeploymentConfig {
  locationId: string;
  channels: GoHighLevelChannel[];
  globalSettings?: GoHighLevelGlobalSettings;
  optedOutConversations?: string[];
  [key: string]: unknown;
}

/**
 * Webhook payload structure
 */
export interface GoHighLevelWebhookPayload {
  type: string;
  locationId: string;
  attachments: string[];
  body: string;
  contactId: string;
  contentType: string;
  conversationId: string;
  dateAdded: string;
  direction: "inbound" | "outbound";
  messageType: GoHighLevelMessageType;
  status: string;
  messageId: string;
  userId?: string;
  conversationProviderId?: string;
  callDuration?: number;
  callStatus?: string;
  from?: string;
  threadId?: string;
  subject?: string;
  to?: string[];
  cc?: string[];
  bcc?: string[];
  timestamp?: string;
  webhookId?: string; // For webhook validation
  tags?: Array<{ name: string }>;
  [key: string]: unknown;
}

/**
 * Contact Tag Update webhook payload structure
 */
export interface GoHighLevelContactTagUpdatePayload {
  type: "ContactTagUpdate";
  locationId: string;
  id: string; // Contact ID
  address1?: string;
  city?: string;
  state?: string;
  companyName?: string;
  country?: string;
  source?: string;
  dateAdded: string;
  dateOfBirth?: string;
  dnd?: boolean;
  email?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  postalCode?: string;
  tags: string[]; // Array of tag names
  website?: string;
  attachments?: unknown[];
  assignedTo?: string;
  customFields?: Array<{
    id: string;
    value: string;
  }>;
  [key: string]: unknown;
}

/**
 * Message structure for sending messages
 */
export interface GoHighLevelMessage {
  type: GoHighLevelMessageType;
  contactId: string;
  message: string;
  conversationId?: string;
  locationId?: string;
  html?: string;
  subject?: string; // For email
  appointmentId?: string;
  attachments?: string[];
  fromNumber?: string;
  toNumber?: string;
  conversationProviderId?: string;
  // Email specific fields
  emailFrom?: string;
  emailTo?: string;
  emailCc?: string[];
  emailBcc?: string[];
  emailReplyMode?: "reply" | "reply_all";
  threadId?: string;
  replyMessageId?: string;
  [key: string]: unknown;
}

/**
 * Calendar interface for GoHighLevel
 */
export interface GoHighLevelCalendar {
  id: string;
  name: string;
  isActive?: boolean;
  description?: string;
  locationId?: string;
  groupId?: string;
  calendarType?: string;
  eventColor?: string;
  isPrimary?: boolean;
  slug?: string;
  widgetSlug?: string;
  slotDuration?: number;
  slotDurationUnit?: string;
}

/**
 * Location interface for GoHighLevel
 */
export interface GoHighLevelLocation {
  id: string;
  name: string;
  isMain?: boolean;
  description?: string;
}

/**
 * Time slot type for calendar scheduling
 */
export type GoHighLevelDayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface GoHighLevelTimeSlot {
  day: GoHighLevelDayOfWeek;
  startTime: string;
  endTime: string;
}

export const GOHIGHLEVEL_DAYS_OF_WEEK = [
  { id: "monday", label: "Monday" },
  { id: "tuesday", label: "Tuesday" },
  { id: "wednesday", label: "Wednesday" },
  { id: "thursday", label: "Thursday" },
  { id: "friday", label: "Friday" },
  { id: "saturday", label: "Saturday" },
  { id: "sunday", label: "Sunday" },
] as const;

/**
 * Appointment interface for GoHighLevel
 */
export interface GoHighLevelAppointment {
  id: string;
  botId: string;
  conversationId?: string | null;
  calendarId?: string | null;
  externalEventId?: string | null;
  calendarProvider: string;
  title?: string | null;
  description?: string | null;
  location?: string | null;
  status?: string | null;
  startTime: string;
  endTime: string;
  timeZone?: string | null;
  organizer?: Record<string, unknown> | null;
  attendees?: Array<{
    email: string;
    name?: string;
    response?: string;
    [key: string]: string | undefined;
  }> | null;
  recurringPattern?: string | null;
  meetingLink?: string | null;
  source?: string | null;
  properties?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}
