"use server";

import { createSafeActionClient } from "next-safe-action";
import { z } from "zod";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { ActionResponse } from "./types";

const actionClient = createSafeActionClient();

// Schema for updating lead capture configuration
const updateLeadCaptureConfigSchema = z.object({
  botId: z.string(),
  toolId: z.string(),
  config: z.object({
    requiredFields: z.array(z.string()).min(1),
    leadNotifications: z.boolean(),
    leadCaptureTriggers: z.array(z.string()),
    customTriggerPhrases: z.array(z.string()).optional(),
  }),
});

/**
 * Server action to update lead capture configuration
 */
export const updateLeadCaptureConfig = actionClient
  .schema(updateLeadCaptureConfigSchema)
  .action(async ({ parsedInput }): Promise<ActionResponse> => {
    try {
      // Extract data from the parsed input
      const { botId, toolId, config } = parsedInput;

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
        // Update the existing bot tool
        await prisma.botTool.update({
          where: {
            id: botTool.id,
          },
          data: {
            config,
          },
        });
      } else {
        // Create a new bot tool
        await prisma.botTool.create({
          data: {
            botId,
            toolId,
            config,
            isEnabled: true,
          },
        });
      }

      return {
        success: true,
        data: {
          message: "Lead capture configuration updated successfully",
        },
      };
    } catch (error) {
      console.error("Error updating lead capture configuration:", error);
      return {
        success: false,
        error: {
          message: "Failed to update lead capture configuration",
          code: "UPDATE_FAILED",
        },
      };
    }
  });

// Schema for fetching leads
const getLeadsSchema = z.object({
  botId: z.string(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
});

/**
 * Server action to fetch captured leads
 */
export const getLeads = actionClient
  .schema(getLeadsSchema)
  .action(async ({ parsedInput }): Promise<ActionResponse> => {
    try {
      const { botId, page, limit } = parsedInput;

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

      // In a real implementation, fetch leads from a Lead model with pagination
      // For now, return mock data
      const mockLeads = [
        {
          id: "lead_1",
          name: "John Doe",
          email: "john.doe@example.com",
          phone: "123-456-7890",
          company: "Acme Inc",
          status: "New",
          createdAt: new Date(Date.now() - 2 * 86400000), // 2 days ago
        },
        {
          id: "lead_2",
          name: "Jane Smith",
          email: "jane.smith@example.com",
          phone: "987-654-3210",
          company: "ABC Corp",
          status: "Contacted",
          createdAt: new Date(Date.now() - 5 * 86400000), // 5 days ago
        },
      ];

      // Simulate pagination using the limit and page parameters
      const totalCount = mockLeads.length;
      const totalPages = Math.ceil(totalCount / limit);
      const paginatedLeads = mockLeads.slice((page - 1) * limit, page * limit);

      return {
        success: true,
        data: {
          leads: paginatedLeads,
          totalCount,
          page,
          totalPages,
          limit,
        },
      };
    } catch (error) {
      console.error("Error fetching leads:", error);
      return {
        success: false,
        error: {
          message: "Failed to fetch leads",
          code: "FETCH_FAILED",
        },
      };
    }
  });

// Schema for exporting leads
const exportLeadsSchema = z.object({
  botId: z.string(),
  format: z.enum(["csv", "json"]).default("csv"),
});

/**
 * Server action to export leads to CSV/JSON
 */
export const exportLeads = actionClient
  .schema(exportLeadsSchema)
  .action(async ({ parsedInput }): Promise<ActionResponse> => {
    try {
      const { botId, format } = parsedInput;

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

      // In a real implementation, generate and return a download URL
      // For now, return a mock URL
      return {
        success: true,
        data: {
          downloadUrl: `/api/bots/${botId}/leads/export?format=${format}`,
          message: `Leads exported successfully as ${format.toUpperCase()}`,
        },
      };
    } catch (error) {
      console.error("Error exporting leads:", error);
      return {
        success: false,
        error: {
          message: "Failed to export leads",
          code: "EXPORT_FAILED",
        },
      };
    }
  });
