"use server";

import { createSafeActionClient } from "next-safe-action";
import { z } from "zod";
import type {
  ActionResponse,
  ConversationData,
  MessageData,
  ToolExecutionData,
} from "./types";
import { appErrors } from "./types";
import { prisma } from "@/lib/db/prisma";
import { revalidateTag } from "next/cache";
import { InputJsonValue } from "@/lib/generated/prisma/runtime/library";
import { getVectorDb } from "@/lib/vectordb";
import { QueryResult } from "@/lib/vectordb/types";
import * as CACHE_TAGS from "@/lib/constants/cache-tags";

const action = createSafeActionClient();

// Schema for creating a new conversation
const createConversationSchema = z.object({
  botId: z.string(),
  externalUserId: z.string().optional(),
  source: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  clientInfo: z.record(z.unknown()).optional(),
});

// Schema for adding a message to a conversation
const addMessageSchema = z.object({
  conversationId: z.string(),
  role: z.enum(["USER", "ASSISTANT", "SYSTEM"]),
  content: z.string(),
  responseMessages: z.array(z.record(z.unknown())).optional(),
  contextUsed: z.record(z.unknown()).optional(),
  processingTime: z.number().int().optional(),
  tokenCount: z.number().int().optional(),
});

// Schema for updating a conversation
const updateConversationSchema = z.object({
  id: z.string(),
  endedAt: z.date().optional(),
  status: z.enum(["ACTIVE", "COMPLETED", "FAILED", "ABANDONED"]).optional(),
  errorLog: z.record(z.unknown()).optional(),
  sentiment: z.number().min(-1).max(1).optional(),
});

// Schema for tracking tool execution
const trackToolExecutionSchema = z.object({
  messageId: z.string(),
  conversationId: z.string(),
  toolId: z.string(),
  functionName: z.string(),
  params: z.record(z.unknown()),
  result: z.record(z.unknown()).optional(),
  status: z
    .enum(["PENDING", "IN_PROGRESS", "COMPLETED", "FAILED", "TIMEOUT"])
    .optional(),
  startTime: z.date().optional(),
  endTime: z.date().optional(),
  executionTime: z.number().int().optional(),
  error: z.record(z.unknown()).optional(),
});

// Schema for updating tool execution
const updateToolExecutionSchema = z.object({
  id: z.string(),
  result: z.record(z.unknown()).optional(),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "FAILED", "TIMEOUT"]),
  endTime: z.date().optional(),
  executionTime: z.number().int().optional(),
  error: z.record(z.unknown()).optional(),
});

/**
 * Create a new conversation
 */
export const createConversation = action
  .schema(createConversationSchema)
  .action(
    async ({ parsedInput }): Promise<ActionResponse<ConversationData>> => {
      try {
        const {
          botId,
          externalUserId,
          source,
          metadata = {},
          clientInfo = {},
        } = parsedInput;
        const conversation = await prisma.conversation.create({
          data: {
            botId,
            externalUserId,
            source,
            metadata: metadata as InputJsonValue,
            clientInfo: clientInfo as InputJsonValue,
            status: "ACTIVE",
          },
        });

        // Revalidate conversation cache tags
        revalidateTag(CACHE_TAGS.USER_CONVERSATIONS(conversation.botId));

        return {
          success: true,
          data: {
            id: conversation.id,
            botId: conversation.botId,
            externalUserId: conversation.externalUserId || undefined,
            source: conversation.source || undefined,
            metadata:
              (conversation.metadata as Record<string, unknown>) || undefined,
            clientInfo:
              (conversation.clientInfo as Record<string, unknown>) || undefined,
          },
        };
      } catch (error) {
        console.error("Error creating conversation:", error);
        return {
          success: false,
          error: appErrors.CONVERSATION_ERROR,
        };
      }
    }
  );

/**
 * Add a message to an existing conversation
 */
export const addMessage = action
  .schema(addMessageSchema)
  .action(async ({ parsedInput }): Promise<ActionResponse<MessageData>> => {
    try {
      const {
        conversationId,
        role,
        content,
        responseMessages,
        contextUsed,
        processingTime,
        tokenCount,
      } = parsedInput;
      const message = await prisma.message.create({
        data: {
          conversationId: conversationId,
          role: role,
          content: content,
          responseMessages: responseMessages as InputJsonValue,
          contextUsed: contextUsed as InputJsonValue,
          processingTime: processingTime || null,
          tokenCount: tokenCount || null,
        },
      });

      // Update conversation to make sure it's marked as active
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { status: "ACTIVE" },
      });

      // Revalidate conversation cache tag
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        select: { botId: true },
      });

      if (conversation) {
        revalidateTag(CACHE_TAGS.USER_CONVERSATIONS(conversation.botId));
      }

      return {
        success: true,
        data: {
          id: message.id,
          conversationId: message.conversationId,
          role: message.role,
          content: message.content,
          responseMessages:
            (message.responseMessages as Record<string, unknown>[]) ||
            undefined,
          contextUsed:
            (message.contextUsed as Record<string, unknown>) || undefined,
          processingTime: message.processingTime || undefined,
          tokenCount: message.tokenCount || undefined,
        },
      };
    } catch (error) {
      console.error("Error adding message:", error);
      return {
        success: false,
        error: appErrors.CONVERSATION_ERROR,
      };
    }
  });

/**
 * Update an existing conversation (mark as completed, add errors, etc.)
 */
export const updateConversation = action
  .schema(updateConversationSchema)
  .action(
    async ({ parsedInput }): Promise<ActionResponse<ConversationData>> => {
      try {
        const { id, endedAt, status, errorLog, sentiment } = parsedInput;
        const conversation = await prisma.conversation.update({
          where: { id: id },
          data: {
            endedAt: endedAt,
            status: status,
            errorLog: errorLog as InputJsonValue,
            sentiment: sentiment,
          },
        });

        // Revalidate conversation cache tags
        revalidateTag(CACHE_TAGS.USER_CONVERSATIONS(conversation.botId));

        return {
          success: true,
          data: {
            id: conversation.id,
            botId: conversation.botId,
            externalUserId: conversation.externalUserId || undefined,
            source: conversation.source || undefined,
            metadata:
              (conversation.metadata as Record<string, unknown>) || undefined,
            clientInfo:
              (conversation.clientInfo as Record<string, unknown>) || undefined,
          },
        };
      } catch (error) {
        console.error("Error updating conversation:", error);
        return {
          success: false,
          error: appErrors.CONVERSATION_ERROR,
        };
      }
    }
  );

/**
 * Track a tool execution within a conversation
 */
export const trackToolExecution = action
  .schema(trackToolExecutionSchema)
  .action(
    async ({ parsedInput }): Promise<ActionResponse<ToolExecutionData>> => {
      try {
        const {
          messageId,
          conversationId,
          toolId,
          functionName,
          params,
          result,
          status,
          startTime,
          endTime,
          executionTime,
          error,
        } = parsedInput;
        const toolExecution = await prisma.toolExecution.create({
          data: {
            messageId: messageId,
            conversationId: conversationId,
            toolId: toolId,
            functionName: functionName,
            params: params as InputJsonValue,
            result: result as InputJsonValue,
            status: status || "PENDING",
            startTime: startTime || new Date(),
            endTime: endTime || null,
            executionTime: executionTime || null,
            error: error as InputJsonValue,
          },
        });

        return {
          success: true,
          data: {
            messageId: toolExecution.messageId,
            conversationId: toolExecution.conversationId,
            toolId: toolExecution.toolId,
            functionName: toolExecution.functionName,
            params: toolExecution.params as Record<string, unknown>,
            result:
              (toolExecution.result as Record<string, unknown>) || undefined,
            status: toolExecution.status as
              | "PENDING"
              | "IN_PROGRESS"
              | "COMPLETED"
              | "FAILED"
              | "TIMEOUT",
            startTime: toolExecution.startTime,
            endTime: toolExecution.endTime || undefined,
            executionTime: toolExecution.executionTime || undefined,
            error:
              (toolExecution.error as Record<string, unknown>) || undefined,
          },
        };
      } catch (error) {
        console.error("Error tracking tool execution:", error);
        return {
          success: false,
          error: appErrors.CONVERSATION_ERROR,
        };
      }
    }
  );

/**
 * Update a tool execution (complete it, mark as failed, etc.)
 */
export const updateToolExecution = action
  .schema(updateToolExecutionSchema)
  .action(
    async ({ parsedInput }): Promise<ActionResponse<ToolExecutionData>> => {
      try {
        const { id, result, status, endTime, executionTime, error } =
          parsedInput;
        const toolExecution = await prisma.toolExecution.update({
          where: { id: id },
          data: {
            result: result as InputJsonValue,
            status: status,
            endTime: endTime || new Date(),
            executionTime: executionTime,
            error: error as InputJsonValue,
          },
          include: {
            conversation: {
              select: {
                botId: true,
              },
            },
          },
        });

        // Revalidate conversation cache tags
        if (toolExecution.conversation) {
          revalidateTag(
            CACHE_TAGS.USER_CONVERSATIONS(toolExecution.conversation.botId)
          );
        }

        return {
          success: true,
          data: {
            messageId: toolExecution.messageId,
            conversationId: toolExecution.conversationId,
            toolId: toolExecution.toolId,
            functionName: toolExecution.functionName,
            params: toolExecution.params as Record<string, unknown>,
            result:
              (toolExecution.result as Record<string, unknown>) || undefined,
            status: toolExecution.status as
              | "PENDING"
              | "IN_PROGRESS"
              | "COMPLETED"
              | "FAILED"
              | "TIMEOUT",
            startTime: toolExecution.startTime,
            endTime: toolExecution.endTime || undefined,
            executionTime: toolExecution.executionTime || undefined,
            error:
              (toolExecution.error as Record<string, unknown>) || undefined,
          },
        };
      } catch (error) {
        console.error("Error updating tool execution:", error);
        return {
          success: false,
          error: appErrors.CONVERSATION_ERROR,
        };
      }
    }
  );

/**
 * Retrieve context from knowledge base for a bot and query
 */
export async function retrieveKnowledgeContext(
  botId: string,
  query: string,
  limit = 5
) {
  try {
    const vectorDb = await getVectorDb();

    // Query the vector database for relevant context
    const vectorDbQueryResults: QueryResult[] = await vectorDb.query(
      { botId },
      query,
      limit
    );

    const usedDocuments = vectorDbQueryResults.map((document: QueryResult) => ({
      id: document.id || "",
      documentId: document.metadata.documentId || "",
      score: document.score,
    }));

    let contextualInfo = "";
    if (vectorDbQueryResults.length > 0) {
      contextualInfo = vectorDbQueryResults
        .map((result: QueryResult) => result.chunk)
        .join("\n\n");
    }

    return {
      success: true,
      data: {
        usedDocuments,
        contextualInfo,
        hasKnowledgeContext: vectorDbQueryResults.length > 0,
      },
    };
  } catch (error) {
    console.error("Error retrieving knowledge context:", error);
    return {
      success: false,
      error: appErrors.UNEXPECTED_ERROR,
    };
  }
}

/**
 * Mark conversation as completed
 */
export async function completeConversation(conversationId: string) {
  try {
    await prisma.conversation.update({
      where: {
        id: conversationId,
      },
      data: {
        endedAt: new Date(),
        status: "COMPLETED",
      },
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error completing conversation:", error);
    return {
      success: false,
      error: appErrors.CONVERSATION_ERROR,
    };
  }
}

/**
 * Mark conversation as abandoned
 */
export async function abandonConversation(conversationId: string) {
  try {
    await prisma.conversation.update({
      where: {
        id: conversationId,
      },
      data: {
        endedAt: new Date(),
        status: "ABANDONED",
      },
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error abandoning conversation:", error);
    return {
      success: false,
      error: appErrors.CONVERSATION_ERROR,
    };
  }
}

/**
 * Mark conversation as failed
 */
export async function failConversation(conversationId: string) {
  try {
    await prisma.conversation.update({
      where: {
        id: conversationId,
      },
      data: {
        endedAt: new Date(),
        status: "FAILED",
      },
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error failing conversation:", error);
    return {
      success: false,
      error: appErrors.CONVERSATION_ERROR,
    };
  }
}

/**
 * Mark conversation as active
 */
export async function activateConversation(conversationId: string) {
  try {
    await prisma.conversation.update({
      where: {
        id: conversationId,
      },
      data: {
        status: "ACTIVE",
      },
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error activating conversation:", error);
    return {
      success: false,
      error: appErrors.CONVERSATION_ERROR,
    };
  }
}
