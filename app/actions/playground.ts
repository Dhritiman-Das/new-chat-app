"use server";

import { createSafeActionClient } from "next-safe-action";
import { z } from "zod";
import { ActionResponse, appErrors } from "./types";
import { requireAuth } from "@/utils/auth";

// Create safe action client
const action = createSafeActionClient();

// Placeholder for future playground-specific actions
// For now, all playground actions are in organizations.ts

// Example: Future action for saving playground configurations
const savePlaygroundConfigSchema = z.object({
  botId: z.string(),
  modelId: z.string(),
  configuration: z.record(z.unknown()),
});

export const savePlaygroundConfig = action
  .schema(savePlaygroundConfigSchema)
  .action(async ({ parsedInput }): Promise<ActionResponse> => {
    try {
      const user = await requireAuth();
      const { botId, modelId, configuration } = parsedInput;

      // TODO: Implement playground configuration saving logic
      // This is a placeholder for future functionality
      console.log(
        "Saving config for user:",
        user.id,
        "bot:",
        botId,
        "model:",
        modelId,
        "config:",
        configuration
      );

      return {
        success: true,
        data: { saved: true },
      };
    } catch (error) {
      console.error("Error saving playground config:", error);
      return {
        success: false,
        error: appErrors.UNEXPECTED_ERROR,
      };
    }
  });
