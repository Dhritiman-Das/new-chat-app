import { DeploymentType } from "@/lib/generated/prisma";

/**
 * Message format for chat messages
 */
export interface ChatMessage {
  role: string;
  content: string;
}

/**
 * Platform adapters for different deployment types
 */
export interface DeploymentPlatform {
  type: string;
  sendMessage: (content: string) => Promise<void>;
  setStatus?: (status: string) => Promise<void>;
  supportsStreaming?: boolean;
  appendToMessage?: (chunk: string) => Promise<void>;
}

/**
 * Options for processing messages across different platforms
 */
export interface ProcessMessageOptions {
  botId: string;
  userId: string;
  organizationId: string;
  source: string;
  deploymentType: string | DeploymentType;
  messages: ChatMessage[];
  platform: DeploymentPlatform;
  conversationId?: string;
  modelId?: string;
}

/**
 * Response from the chat API
 */
export interface ChatApiResponse {
  text?: string;
  error?: string;
  conversationId?: string;
}
