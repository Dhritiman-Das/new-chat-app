"use server";

import { createSafeActionClient } from "next-safe-action";
import { z } from "zod";
import { getConversationById } from "@/lib/queries/cached-queries";
import type { ActionResponse } from "@/app/actions/types";

// Schema for fetching conversation data
const schema = z.object({
  conversationId: z.string().uuid(),
});

// Action to fetch a conversation by ID
export const fetchConversation = createSafeActionClient()
  .schema(schema)
  .action(async ({ parsedInput }): Promise<ActionResponse> => {
    try {
      const { conversationId } = parsedInput;
      const result = await getConversationById(conversationId);

      if (!result.data) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Conversation not found",
          },
        };
      }

      return {
        success: true,
        data: result.data,
      };
    } catch (error) {
      console.error("Error fetching conversation:", error);
      return {
        success: false,
        error: {
          code: "FETCH_ERROR",
          message: "Failed to fetch conversation data",
        },
      };
    }
  });
