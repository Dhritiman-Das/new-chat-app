// Common type definitions for server actions

export interface AppError {
  code: string;
  message: string;
}

export const appErrors = {
  INVALID_INPUT: {
    code: "INVALID_INPUT",
    message: "The provided input is invalid",
  },
  UNEXPECTED_ERROR: {
    code: "UNEXPECTED_ERROR",
    message: "An unexpected error occurred",
  },
  UNAUTHORIZED: {
    code: "UNAUTHORIZED",
    message: "You are not authorized to perform this action",
  },
  NOT_FOUND: {
    code: "NOT_FOUND",
    message: "Resource not found",
  },
  CONVERSATION_ERROR: {
    code: "CONVERSATION_ERROR",
    message: "Error occurred during conversation tracking",
  },
};

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: AppError;
}

// Knowledge context types
export interface DocumentReference {
  documentId: string;
  score?: number;
}

export interface KnowledgeContext {
  documents: DocumentReference[];
  hasKnowledgeContext: boolean;
}

// Conversation tracking types
export interface ConversationData {
  id?: string; // Optional for existing conversation
  botId: string;
  externalUserId?: string;
  source?: string;
  metadata?: Record<string, unknown>;
  clientInfo?: Record<string, unknown>;
}

export interface MessageData {
  id?: string; // Optional for existing message
  conversationId: string;
  role: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
  responseMessages?: Record<string, unknown>[];
  contextUsed?: KnowledgeContext | Record<string, unknown>;
  processingTime?: number;
  tokenCount?: number;
}

export interface ToolExecutionData {
  messageId: string;
  conversationId: string;
  toolId: string;
  functionName: string;
  params: Record<string, unknown>;
  result?: Record<string, unknown>;
  status?: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "TIMEOUT";
  startTime?: Date;
  endTime?: Date;
  executionTime?: number;
  error?: Record<string, unknown>;
}
