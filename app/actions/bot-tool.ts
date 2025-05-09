"use server";

import prisma from "@/lib/db/prisma";
import { z } from "zod";
import { ActionResponse } from "./types";
import { createSafeActionClient } from "next-safe-action";
import { auth } from "@/lib/auth";

const actionClient = createSafeActionClient();

const toggleBotToolActiveStatusSchema = z.object({
  botId: z.string(),
  toolId: z.string(),
  active: z.boolean(),
});

/**
 * Server action to toggle the active status of a bot tool
 */
export const toggleBotToolActiveStatus = actionClient
  .schema(toggleBotToolActiveStatusSchema)
  .action(
    async ({ parsedInput }): Promise<ActionResponse<{ message: string }>> => {
      try {
        const { botId, toolId, active } = parsedInput;

        // Get the authenticated user
        const session = await auth();
        if (!session?.user?.id) {
          return {
            success: false,
            error: {
              message: "User not authenticated",
              code: "UNAUTHORIZED",
            },
          };
        }

        const userId = session.user.id;

        // Verify that the user has access to this bot
        const bot = await prisma.bot.findFirst({
          where: {
            id: botId,
            userId,
          },
        });

        if (!bot) {
          return {
            success: false,
            error: {
              message: "Bot not found or access denied",
              code: "NOT_FOUND",
            },
          };
        }

        // Find the existing bot tool
        const botTool = await prisma.botTool.findFirst({
          where: {
            botId,
            toolId,
          },
        });

        if (botTool) {
          // Update the existing bot tool's active status
          await prisma.botTool.update({
            where: {
              id: botTool.id,
            },
            data: {
              isEnabled: active,
            },
          });
        } else {
          // Create a new bot tool with the specified active status
          await prisma.botTool.create({
            data: {
              botId,
              toolId,
              isEnabled: active,
            },
          });
        }

        return {
          success: true,
          data: {
            message: `Tool ${active ? "enabled" : "disabled"} successfully`,
          },
        };
      } catch (error) {
        console.error("Error toggling bot tool status:", error);
        return {
          success: false,
          error: {
            message: "Failed to toggle bot tool status",
            code: "UPDATE_FAILED",
          },
        };
      }
    }
  );
