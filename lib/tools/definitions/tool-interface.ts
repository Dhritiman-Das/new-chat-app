import { z } from "zod";

export interface ToolContext {
  userId: string;
  botId: string;
  organizationId: string;
  toolCredentialId?: string;
  credentials?: Record<string, unknown>;
  config?: Record<string, unknown>;
  conversationId?: string;
}

export interface ToolFunction {
  description: string;
  parameters: z.ZodType;
  execute: (
    params: Record<string, unknown>,
    context: ToolContext
  ) => Promise<unknown>;
}

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  type: string;
  integrationType?: string;
  version: string;
  configSchema: z.ZodType;
  functions: Record<string, ToolFunction>;
  getCredentialSchema: () => z.ZodType;
  defaultConfig?: Record<string, unknown>;
}
