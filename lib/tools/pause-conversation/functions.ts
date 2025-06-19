import prisma from "@/lib/db/prisma";
import { ToolFunction } from "../definitions/tool-interface";
import { checkPauseConditionSchema, pauseConversationSchema } from "./schema";

// Extended ToolContext with the fields we need
interface PauseConversationToolContext {
  botId: string;
  toolId?: string;
  conversationId?: string;
  config?: Record<string, unknown>;
}

// Type for config
interface PauseConversationConfig {
  pauseConditionPrompt?: string;
  pauseMessage?: string;
}

// Function that dynamically generates the checkPauseCondition tool based on config
export function createCheckPauseConditionFunction(
  config: PauseConversationConfig
): ToolFunction {
  const pauseCondition =
    config.pauseConditionPrompt ||
    "The user wants to end the conversation or talk to a human";

  return {
    description: `Analyze the user message to determine if it matches the pause condition. Pause condition: "${pauseCondition}". You must determine if the user message indicates that the conversation should be paused based on this specific condition.`,
    parameters: checkPauseConditionSchema,
    execute: async (params) => {
      try {
        // Extract parameters from AI decision
        const { message, detectedPauseCondition, pauseConditionReason } =
          params as {
            message: string;
            detectedPauseCondition: boolean;
            pauseConditionReason?: string;
          };

        console.log("Pause condition check:", {
          message,
          detectedPauseCondition,
          pauseConditionReason,
          pauseCondition,
        });

        return {
          success: true,
          detected: detectedPauseCondition,
          data: {
            shouldPause: detectedPauseCondition,
            reason:
              pauseConditionReason ||
              (detectedPauseCondition
                ? "Pause condition met"
                : "No pause condition detected"),
            triggerMessage: message,
            pauseCondition,
          },
        };
      } catch (error) {
        console.error("Error checking pause condition:", error);
        return {
          success: false,
          detected: false,
          error: {
            code: "PAUSE_CONDITION_CHECK_FAILED",
            message: "Failed to check pause condition",
            details: error instanceof Error ? error.message : String(error),
          },
        };
      }
    },
  };
}

// Legacy function for backward compatibility - will be replaced dynamically
export const checkPauseCondition: ToolFunction = {
  description:
    "Check if the user message matches conditions that should pause the conversation",
  parameters: checkPauseConditionSchema,
  execute: async (params, context) => {
    // This should be replaced by the dynamic function when the tool is initialized
    const config = (context.config || {}) as PauseConversationConfig;
    const dynamicFunction = createCheckPauseConditionFunction(config);
    return dynamicFunction.execute(params, context);
  },
};

export const pauseConversation: ToolFunction = {
  description:
    "Pause the current conversation and prevent further bot responses",
  parameters: pauseConversationSchema,
  execute: async (params, context) => {
    try {
      // Type-safe cast of context
      const toolContext = context as unknown as PauseConversationToolContext;

      // Extract parameters
      const { reason, triggerMessage } = params as {
        reason: string;
        triggerMessage?: string;
      };

      const conversationId = toolContext.conversationId;

      if (!conversationId) {
        return {
          success: false,
          error: {
            code: "NO_CONVERSATION_ID",
            message: "No conversation ID provided",
          },
        };
      }

      console.log("Pausing conversation:", {
        conversationId,
        reason,
        triggerMessage,
      });

      // Get config from context
      const config = (toolContext.config || {}) as PauseConversationConfig;
      const pauseMessage = config.pauseMessage?.trim() || "";

      // Update the conversation to set isPaused to true
      const updatedConversation = await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          isPaused: true,
          metadata: {
            pausedAt: new Date().toISOString(),
            pausedReason: reason,
            pausedBy: "pause-conversation-tool",
            triggerMessage: triggerMessage || null,
            shouldSendResponse: pauseMessage.length > 0, // Track if we should send a response
          },
        },
      });

      console.log("Conversation paused successfully:", updatedConversation.id);

      // If pauseMessage is empty, signal that no response should be sent
      if (pauseMessage.length === 0) {
        return {
          success: true,
          message: "", // Empty message
          data: {
            conversationId: updatedConversation.id,
            pausedAt: new Date().toISOString(),
            reason,
            pauseMessage: "",
            shouldSendResponse: false, // Signal to not send any response
          },
          skipResponse: true, // Custom flag to indicate no response should be sent
        };
      }

      return {
        success: true,
        message: pauseMessage,
        data: {
          conversationId: updatedConversation.id,
          pausedAt: new Date().toISOString(),
          reason,
          pauseMessage,
          shouldSendResponse: true,
        },
      };
    } catch (error) {
      console.error("Error pausing conversation:", error);
      return {
        success: false,
        error: {
          code: "PAUSE_CONVERSATION_FAILED",
          message: "Failed to pause conversation",
          details: error instanceof Error ? error.message : String(error),
        },
      };
    }
  },
};
