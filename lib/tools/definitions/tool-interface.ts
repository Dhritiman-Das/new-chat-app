import { z } from "zod";

export interface ToolContext {
  userId: string;
  botId: string;
  organizationId: string;
  credentialId?: string;
  credentials?: Record<string, unknown>;
  config?: Record<string, unknown>;
  conversationId?: string;
  webhookPayload?: Record<string, unknown>; // Webhook payload data for bot deployments
}

export interface ToolFunction {
  description: string;
  parameters: z.ZodType;
  execute: (
    params: Record<string, unknown>,
    context: ToolContext
  ) => Promise<unknown>;
}

export interface AuthRequirement {
  required: boolean;
  provider?: string; // e.g., "google", "microsoft", "slack"
  scopes?: string[]; // OAuth scopes needed
  authAction?: string; // Action name for connecting (e.g., "connectGoogleCalendar")
  disconnectAction?: string; // Action name for disconnecting (e.g., "disconnectGoogleCalendar")
  authUrl?: string; // Optional direct auth URL if not using server actions
}

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  type: string;
  integrationType?: string;
  version: string;
  icon: React.ReactNode;
  configSchema: z.ZodType;
  functions: Record<string, ToolFunction>;
  getCredentialSchema: () => z.ZodType;
  defaultConfig?: Record<string, unknown>;
  auth?: AuthRequirement; // Authentication requirements
  moreDetailsDialog?: React.ReactNode;
}
