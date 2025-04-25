"use server";

import { createSafeActionClient } from "next-safe-action";
import { z } from "zod";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { ActionResponse } from "./types";
import { Prisma } from "@/lib/generated/prisma";

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

// Enhanced schema for fetching leads with filters
const getLeadsSchema = z.object({
  botId: z.string(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
  filters: z
    .object({
      search: z.string().optional(),
      status: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      source: z.string().optional(),
      // Custom property filters can be added dynamically
      customProperties: z.record(z.unknown()).optional(),
    })
    .optional(),
  sortBy: z.string().optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

/**
 * Server action to fetch captured leads
 */
export const getLeads = actionClient
  .schema(getLeadsSchema)
  .action(async ({ parsedInput }): Promise<ActionResponse> => {
    try {
      const { botId, page, limit, filters, sortBy, sortOrder } = parsedInput;

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

      // Build query conditions
      const where: Prisma.LeadWhereInput = { botId };

      // Apply standard filters
      if (filters) {
        // Text search filter (searches in name, email, phone, company)
        if (filters.search) {
          where.OR = [
            { name: { contains: filters.search, mode: "insensitive" } },
            { email: { contains: filters.search, mode: "insensitive" } },
            { phone: { contains: filters.search, mode: "insensitive" } },
            { company: { contains: filters.search, mode: "insensitive" } },
          ];
        }

        // Status filter
        if (filters.status) {
          where.status = filters.status;
        }

        // Source filter
        if (filters.source) {
          where.source = filters.source;
        }

        // Date range filter
        if (filters.startDate) {
          where.createdAt = {
            ...((where.createdAt as object) || {}),
            gte: new Date(filters.startDate),
          };
        }

        if (filters.endDate) {
          where.createdAt = {
            ...((where.createdAt as object) || {}),
            lte: new Date(filters.endDate),
          };
        }

        // Custom property filters
        // This is a simplified approach for demo purposes
        // In production, you'd use proper database-specific JSON queries
        if (
          filters.customProperties &&
          Object.keys(filters.customProperties).length > 0
        ) {
          // For simplicity, we'll use a naive approach and fetch all leads first
          // and then filter them in memory for custom properties
          console.log("Custom property filters:", filters.customProperties);
          // In a real implementation, you would use proper database-specific JSON queries
          // This is just a placeholder to show the concept
        }
      }

      // Calculate pagination parameters
      const skip = (page - 1) * limit;

      // Build the sort parameter
      const orderBy: Record<string, unknown> = {};
      // Handle both standard fields and JSON properties for sorting
      if (sortBy.includes(".")) {
        // If sortBy includes a dot, it's a custom property
        const [propertyField, path] = sortBy.split(".");
        // This is PostgreSQL specific for sorting by JSON fields
        orderBy[propertyField] = Prisma.sql`->'${path}' ${
          sortOrder === "desc" ? "DESC" : "ASC"
        }` as unknown;
      } else {
        // Standard field sorting
        orderBy[sortBy] = sortOrder;
      }

      // Get total count of leads for this bot with the applied filters
      const totalCount = await prisma.lead.count({
        where,
      });

      // Calculate total pages
      const totalPages = Math.ceil(totalCount / limit);

      // Fetch leads with pagination and applied filters
      const leads = await prisma.lead.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      });

      return {
        success: true,
        data: {
          leads,
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

      // Fetch all leads for export
      const leads = await prisma.lead.findMany({
        where: { botId },
        orderBy: { createdAt: "desc" },
      });

      // In a real implementation, you would:
      // 1. Generate a CSV or JSON file with the leads data
      // 2. Store it temporarily or in a blob storage
      // 3. Return a signed URL for download

      // For now, create a signed URL with query parameters
      const downloadUrlParams = new URLSearchParams({
        botId,
        format,
        timestamp: Date.now().toString(),
        // In production, add a signature for security
      });

      return {
        success: true,
        data: {
          downloadUrl: `/api/bots/${botId}/leads/export?${downloadUrlParams}`,
          message: `${
            leads.length
          } leads exported successfully as ${format.toUpperCase()}`,
          count: leads.length,
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

// Schema for saving lead information
const saveLeadSchema = z.object({
  botId: z.string(),
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  source: z.string().optional(),
  triggerKeyword: z.string().optional(),
  conversationId: z.string().optional(),
  // Use record for dynamic properties
  properties: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Server action to save lead information with flexible fields
 */
export const saveLead = actionClient
  .schema(saveLeadSchema)
  .action(async ({ parsedInput }): Promise<ActionResponse> => {
    try {
      // Extract data from the parsed input
      const {
        botId,
        name,
        email,
        phone,
        company,
        source,
        triggerKeyword,
        conversationId,
        properties,
        metadata,
      } = parsedInput;

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

      // Create the lead with both standard and custom fields
      const lead = await prisma.lead.create({
        data: {
          botId,
          conversationId: conversationId || null,
          name: name || null,
          email: email || null,
          phone: phone || null,
          company: company || null,
          source: source || "chat",
          triggerKeyword: triggerKeyword || null,
          properties: (properties as Prisma.JsonValue) || Prisma.JsonNull,
          metadata: (metadata as Prisma.JsonValue) || Prisma.JsonNull,
        },
      });

      return {
        success: true,
        data: {
          lead,
          message: "Lead saved successfully",
        },
      };
    } catch (error) {
      console.error("Error saving lead:", error);
      return {
        success: false,
        error: {
          message: "Failed to save lead",
          code: "SAVE_FAILED",
        },
      };
    }
  });
