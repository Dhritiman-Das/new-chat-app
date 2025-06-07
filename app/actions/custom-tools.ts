"use server";

import { z } from "zod";
import { createSafeActionClient } from "next-safe-action";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { ActionResponse } from "./types";
import {
  customToolSchema,
  CustomToolParameter,
} from "@/lib/tools/custom-tool/schema";
import { revalidateTag } from "next/cache";
import * as CACHE_TAGS from "@/lib/constants/cache-tags";
import { toolRegistry } from "@/lib/tools/registry";

const actionClient = createSafeActionClient();

// Utility function to generate schema from parameters
function generateZodSchemaFromParameters(
  parameters: CustomToolParameter[]
): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const param of parameters) {
    const property: Record<string, unknown> = {
      type: param.type === "array" ? "array" : param.type,
    };

    if (param.description) {
      property.description = param.description;
    }

    if (
      param.type === "string" &&
      param.enumValues &&
      param.enumValues.length > 0
    ) {
      property.enum = param.enumValues;
    }

    if (param.type === "array" && param.itemsType) {
      property.items = {
        type: param.itemsType,
      };
    }

    properties[param.name] = property;

    if (param.required) {
      required.push(param.name);
    }
  }

  return {
    type: "object",
    properties,
    required,
  };
}

// Schema for creating a custom tool
const createCustomToolSchema = customToolSchema.extend({
  botId: z.string(),
});

// Schema for updating a custom tool
const updateCustomToolSchema = customToolSchema.extend({
  toolId: z.string(),
});

// Schema for deleting a custom tool
const deleteCustomToolSchema = z.object({
  toolId: z.string(),
});

/**
 * Server action to create a new custom tool
 */
export const createCustomTool = actionClient
  .schema(createCustomToolSchema)
  .action(
    async ({ parsedInput }): Promise<ActionResponse<{ toolId: string }>> => {
      try {
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

        const {
          name,
          description,
          async: isAsync,
          strict,
          parameters,
          serverUrl,
          secretToken,
          timeout,
          httpHeaders,
          botId,
        } = parsedInput;

        // Verify that the user has access to this bot
        const bot = await prisma.bot.findFirst({
          where: {
            id: botId,
            userId: session.user.id,
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

        // Generate Zod schema for the function parameters
        const functionSchema = generateZodSchemaFromParameters(parameters);

        // Create the tool function configuration
        const functionConfig = {
          name,
          description,
          parameters: parameters,
          schema: functionSchema,
        };

        // Create the tool configuration
        const toolConfig = {
          async: isAsync,
          strict,
          serverUrl,
          secretToken,
          timeout,
          httpHeaders,
        };

        // Create the tool in the database
        const tool = await prisma.tool.create({
          data: {
            name,
            description,
            type: "CUSTOM",
            isActive: true,
            version: "1.0.0",
            createdByBotId: botId,
            functions: JSON.parse(
              JSON.stringify({
                execute: functionConfig,
              })
            ),
            functionsSchema: JSON.parse(
              JSON.stringify({
                execute: functionSchema,
              })
            ),
            requiredConfigs: JSON.parse(JSON.stringify(toolConfig)),
          },
        });

        // Automatically install the tool for the bot
        await prisma.botTool.create({
          data: {
            botId,
            toolId: tool.id,
            isEnabled: true,
            config: toolConfig,
          },
        });

        // Register the new tool in the registry immediately
        const { createCustomToolDefinition } = await import(
          "@/lib/tools/custom-tool"
        );
        const toolDefinition = createCustomToolDefinition({
          id: tool.id,
          name: tool.name,
          description: tool.description || "",
          functions: tool.functions as Record<string, unknown>,
          functionsSchema: tool.functionsSchema as Record<string, unknown>,
          requiredConfigs: tool.requiredConfigs as Record<string, unknown>,
        });
        toolRegistry.register(toolDefinition);

        // Revalidate cache
        revalidateTag(CACHE_TAGS.BOT_TOOLS(botId));
        revalidateTag(CACHE_TAGS.BOT_ALL_TOOLS(botId));

        return {
          success: true,
          data: {
            toolId: tool.id,
          },
        };
      } catch (error) {
        console.error("Error creating custom tool:", error);
        return {
          success: false,
          error: {
            message: "Failed to create custom tool",
            code: "CREATE_FAILED",
          },
        };
      }
    }
  );

/**
 * Server action to update a custom tool
 */
export const updateCustomTool = actionClient
  .schema(updateCustomToolSchema)
  .action(
    async ({ parsedInput }): Promise<ActionResponse<{ message: string }>> => {
      try {
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

        const {
          toolId,
          name,
          description,
          async: isAsync,
          strict,
          parameters,
          serverUrl,
          secretToken,
          timeout,
          httpHeaders,
        } = parsedInput;

        // Verify that the tool exists and is a custom tool
        const existingTool = await prisma.tool.findFirst({
          where: {
            id: toolId,
            type: "CUSTOM",
          },
          include: {
            botTools: {
              include: {
                bot: true,
              },
            },
          },
        });

        if (!existingTool) {
          return {
            success: false,
            error: {
              message: "Custom tool not found",
              code: "NOT_FOUND",
            },
          };
        }

        // Verify that the user has access to at least one bot using this tool
        const hasAccess = existingTool.botTools.some(
          (botTool) => botTool.bot.userId === session.user?.id
        );

        if (!hasAccess) {
          return {
            success: false,
            error: {
              message: "Access denied",
              code: "FORBIDDEN",
            },
          };
        }

        // Generate Zod schema for the function parameters
        const functionSchema = generateZodSchemaFromParameters(parameters);

        // Create the updated function configuration
        const functionConfig = {
          name,
          description,
          parameters: parameters,
          schema: functionSchema,
        };

        // Create the updated tool configuration
        const toolConfig = {
          async: isAsync,
          strict,
          serverUrl,
          secretToken,
          timeout,
          httpHeaders,
        };

        // Update the tool in the database
        await prisma.tool.update({
          where: { id: toolId },
          data: {
            name,
            description,
            functions: JSON.parse(
              JSON.stringify({
                execute: functionConfig,
              })
            ),
            functionsSchema: JSON.parse(
              JSON.stringify({
                execute: functionSchema,
              })
            ),
            requiredConfigs: JSON.parse(JSON.stringify(toolConfig)),
          },
        });

        // Update bot tool configurations
        await prisma.botTool.updateMany({
          where: { toolId },
          data: {
            config: toolConfig,
          },
        });

        // Re-register the updated tool in the registry immediately
        const { createCustomToolDefinition } = await import(
          "@/lib/tools/custom-tool"
        );
        const updatedToolDefinition = createCustomToolDefinition({
          id: toolId,
          name,
          description,
          functions: JSON.parse(JSON.stringify({ execute: functionConfig })),
          functionsSchema: JSON.parse(
            JSON.stringify({ execute: functionSchema })
          ),
          requiredConfigs: JSON.parse(JSON.stringify(toolConfig)),
        });
        toolRegistry.register(updatedToolDefinition);

        // Revalidate cache for all bots using this tool
        for (const botTool of existingTool.botTools) {
          revalidateTag(CACHE_TAGS.BOT_TOOLS(botTool.botId));
          revalidateTag(CACHE_TAGS.BOT_ALL_TOOLS(botTool.botId));
          revalidateTag(CACHE_TAGS.BOT(botTool.botId));
        }

        return {
          success: true,
          data: {
            message: "Custom tool updated successfully",
          },
        };
      } catch (error) {
        console.error("Error updating custom tool:", error);
        return {
          success: false,
          error: {
            message: "Failed to update custom tool",
            code: "UPDATE_FAILED",
          },
        };
      }
    }
  );

/**
 * Server action to delete a custom tool
 */
export const deleteCustomTool = actionClient
  .schema(deleteCustomToolSchema)
  .action(
    async ({ parsedInput }): Promise<ActionResponse<{ message: string }>> => {
      try {
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

        const { toolId } = parsedInput;

        // Verify that the tool exists and is a custom tool
        const existingTool = await prisma.tool.findFirst({
          where: {
            id: toolId,
            type: "CUSTOM",
          },
          include: {
            botTools: {
              include: {
                bot: true,
              },
            },
          },
        });

        if (!existingTool) {
          return {
            success: false,
            error: {
              message: "Custom tool not found",
              code: "NOT_FOUND",
            },
          };
        }

        // Verify that the user has access to at least one bot using this tool
        const hasAccess = existingTool.botTools.some(
          (botTool) => botTool.bot.userId === session.user?.id
        );

        if (!hasAccess) {
          return {
            success: false,
            error: {
              message: "Access denied",
              code: "FORBIDDEN",
            },
          };
        }

        // Store bot IDs for cache invalidation
        const botIds = existingTool.botTools.map((botTool) => botTool.botId);

        // Delete the tool (this will cascade delete bot tools)
        await prisma.tool.delete({
          where: { id: toolId },
        });

        // Revalidate cache for all affected bots
        for (const botId of botIds) {
          revalidateTag(CACHE_TAGS.BOT_TOOLS(botId));
          revalidateTag(CACHE_TAGS.BOT_ALL_TOOLS(botId));
          revalidateTag(CACHE_TAGS.BOT(botId));
        }

        // Remove from tool registry immediately
        toolRegistry.remove(toolId);

        return {
          success: true,
          data: {
            message: "Custom tool deleted successfully",
          },
        };
      } catch (error) {
        console.error("Error deleting custom tool:", error);
        return {
          success: false,
          error: {
            message: "Failed to delete custom tool",
            code: "DELETE_FAILED",
          },
        };
      }
    }
  );
