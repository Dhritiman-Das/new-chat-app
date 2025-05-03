export interface GoHighLevelCredentials {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  scope?: string;
  locationId?: string; // Sub-account ID
}

export interface GoHighLevelClientOptions {
  token: string;
  version?: string;
}

export interface GoHighLevelWebhookPayload {
  type: string;
  locationId: string;
  attachments: string[];
  body: string;
  contactId: string;
  contentType: string;
  conversationId: string;
  dateAdded: string;
  direction: string;
  messageType: string;
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
}

export type GoHighLevelMessageType =
  | "SMS"
  | "Email"
  | "WhatsApp"
  | "IG"
  | "FB"
  | "Custom"
  | "Live_Chat"
  | "CALL";

export interface GoHighLevelMessage {
  type: GoHighLevelMessageType;
  contactId: string;
  message: string;
  conversationId?: string;
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
}

export interface GoHighLevelDeploymentChannel {
  type: GoHighLevelMessageType;
  active: boolean;
  settings?: Record<string, unknown>;
}

export interface GoHighLevelDeploymentConfig {
  locationId: string;
  channels: GoHighLevelDeploymentChannel[];
  globalSettings?: {
    checkKillSwitch?: boolean;
    defaultResponseTime?: string;
    [key: string]: unknown;
  };
}
