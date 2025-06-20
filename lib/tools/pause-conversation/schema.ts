import { z } from "zod";

// Configuration schema for Pause Conversation tool
export const pauseConversationConfigSchema = z.object({
  pauseConditionPrompt: z
    .string()
    .min(1)
    .default("The user wants to end the conversation or talk to a human")
    .describe(
      "Condition that determines when to pause the conversation. Be specific about what phrases or situations should trigger a pause."
    ),
});

// No credentials needed for this tool
export const pauseConversationCredentialSchema = z.object({});

// Function parameter schemas
export const checkPauseConditionSchema = z.object({
  message: z
    .string()
    .describe("User message to check against pause conditions"),
  detectedPauseCondition: z
    .boolean()
    .describe(
      "Whether the pause condition has been detected in the user message"
    ),
  pauseConditionReason: z
    .string()
    .optional()
    .describe("Explanation of why the pause condition was or was not detected"),
});

export const pauseConversationSchema = z.object({
  reason: z.string().describe("Reason why the conversation is being paused"),
  triggerMessage: z
    .string()
    .optional()
    .describe("The user message that triggered the pause"),
});
