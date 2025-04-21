"use server";

import { createSafeActionClient } from "next-safe-action";
import { z } from "zod";
import type { ActionResponse } from "@/app/actions/types";
import { getCachedConversationSources } from "@/lib/queries/cached-queries";

// Create safe action client
const action = createSafeActionClient();

// Schema for fetching conversation sources
const getSourcesSchema = z.object({
  botId: z.string(),
});

/**
 * Fetch available conversation sources for a bot
 */
export const getSources = action
  .schema(getSourcesSchema)
  .action(async ({ parsedInput }): Promise<ActionResponse<string[]>> => {
    try {
      const { botId } = parsedInput;
      const sourcesResponse = await getCachedConversationSources(botId);
      return {
        success: true,
        data: sourcesResponse.data || [],
      };
    } catch (error) {
      console.error("Error fetching conversation sources:", error);
      return {
        success: false,
        error: {
          code: "FETCH_ERROR",
          message: "Failed to fetch conversation sources",
        },
      };
    }
  });
