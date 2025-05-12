import {
  Conversation,
  Message,
  KnowledgeFile,
  Lead,
  Appointment,
} from "@/lib/generated/prisma/client";

export type MessageWithResponse = Message & {
  responseMessages?: ResponseMessage[];
};

export interface ConversationWithMessages
  extends Omit<Conversation, "messages"> {
  messages: MessageWithResponse[];
  leads?: Lead[];
  appointments?: Appointment[];
  bot?: {
    knowledgeBases?: Array<{
      files: KnowledgeFile[];
    }>;
  };
}

export interface ResponseMessage {
  id: string;
  role: "assistant" | "tool";
  content: ResponseMessageContent[];
}

export interface ToolCallContent {
  type: "tool-call";
  args: Record<string, unknown>;
  toolName: string;
  toolCallId: string;
}

export interface ToolResultContent {
  type: "tool-result";
  result: Record<string, unknown>;
  toolName: string;
  toolCallId: string;
}

export interface TextContent {
  type: "text";
  text: string;
}

export type ResponseMessageContent =
  | ToolCallContent
  | ToolResultContent
  | TextContent;

export interface DocumentReference {
  title?: string;
  source?: string;
  filename?: string;
  documentId: string;
  score: number;
}

export interface KnowledgeContext {
  documents: DocumentReference[];
  hasKnowledgeContext: boolean;
}
