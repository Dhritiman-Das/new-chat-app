"use server";

// import { z } from 'zod';
import { requireAuth } from "@/utils/auth";
import { revalidateTag } from "next/cache";
import { ActionResponse, appErrors } from "./types";
import { prisma } from "@/lib/db/prisma";
import { toolRegistry } from "@/lib/tools";
import { initializeTools } from "@/lib/tools";
import { InputJsonValue } from "@/lib/generated/prisma/runtime/library";

// Initialize tools
initializeTools();

// Types for bot actions
type CreateBotInput = {
  name: string;
  description?: string;
  systemPrompt: string;
  organizationId: string;
};

type UpdateBotInput = {
  id: string;
  name?: string;
  description?: string | null;
  systemPrompt?: string;
  isActive?: boolean;
};

// Tool management types
type InstallToolInput = {
  botId: string;
  toolId: string;
  config?: Record<string, unknown>;
};

type UpdateToolStatusInput = {
  botId: string;
  toolId: string;
  enabled: boolean;
};

type UninstallToolInput = {
  botId: string;
  toolId: string;
};

// Action to create a new bot
export async function createBot(data: CreateBotInput): Promise<ActionResponse> {
  try {
    // Validate input
    if (!data.name || data.name.length < 2) {
      return {
        success: false,
        error: {
          ...appErrors.INVALID_INPUT,
          message: "Bot name must be at least 2 characters",
        },
      };
    }

    if (!data.systemPrompt || data.systemPrompt.length < 10) {
      return {
        success: false,
        error: {
          ...appErrors.INVALID_INPUT,
          message: "System prompt must be at least 10 characters",
        },
      };
    }

    if (!data.organizationId) {
      return {
        success: false,
        error: {
          ...appErrors.INVALID_INPUT,
          message: "Organization ID is required",
        },
      };
    }

    // Get the authenticated user
    const user = await requireAuth();

    // Verify that the user is a member of the organization
    const userOrg = await prisma.userOrganization.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: data.organizationId,
        },
      },
    });

    if (!userOrg) {
      return {
        success: false,
        error: appErrors.UNAUTHORIZED,
      };
    }

    // Create the bot
    const bot = await prisma.bot.create({
      data: {
        name: data.name,
        description: data.description || null,
        systemPrompt: data.systemPrompt,
        userId: user.id,
        organizationId: data.organizationId,
      },
    });

    // Revalidate the user bots cache
    revalidateTag(`user_bots_${user.id}`);
    revalidateTag(`organization_bots_${data.organizationId}`);

    return {
      success: true,
      data: bot,
    };
  } catch (error) {
    console.error("Error creating bot:", error);
    return {
      success: false,
      error: appErrors.UNEXPECTED_ERROR,
    };
  }
}

// Action to update a bot
export async function updateBot(data: UpdateBotInput): Promise<ActionResponse> {
  try {
    if (!data.id) {
      return {
        success: false,
        error: { ...appErrors.INVALID_INPUT, message: "Bot ID is required" },
      };
    }

    // Get the authenticated user
    const user = await requireAuth();

    // Check if the bot exists and belongs to the user
    const existingBot = await prisma.bot.findFirst({
      where: {
        id: data.id,
        userId: user.id,
      },
    });

    if (!existingBot) {
      return {
        success: false,
        error: appErrors.NOT_FOUND,
      };
    }

    // Update the bot
    const bot = await prisma.bot.update({
      where: {
        id: data.id,
      },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.systemPrompt && { systemPrompt: data.systemPrompt }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    // Revalidate the user bots cache
    revalidateTag(`user_bots_${user.id}`);
    revalidateTag(`bot_${data.id}`);

    return {
      success: true,
      data: bot,
    };
  } catch (error) {
    console.error("Error updating bot:", error);
    return {
      success: false,
      error: appErrors.UNEXPECTED_ERROR,
    };
  }
}

// Action to delete a bot
export async function deleteBot(data: { id: string }): Promise<ActionResponse> {
  try {
    if (!data.id) {
      return {
        success: false,
        error: { ...appErrors.INVALID_INPUT, message: "Bot ID is required" },
      };
    }

    // Get the authenticated user
    const user = await requireAuth();

    // Check if the bot exists and belongs to the user
    const existingBot = await prisma.bot.findFirst({
      where: {
        id: data.id,
        userId: user.id,
      },
    });

    if (!existingBot) {
      return {
        success: false,
        error: appErrors.NOT_FOUND,
      };
    }

    // Delete the bot
    await prisma.bot.delete({
      where: {
        id: data.id,
      },
    });

    // Revalidate the user bots cache
    revalidateTag(`user_bots_${user.id}`);
    revalidateTag(`organization_bots_${existingBot.organizationId}`);

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error deleting bot:", error);
    return {
      success: false,
      error: appErrors.UNEXPECTED_ERROR,
    };
  }
}

// Action to install a tool to a bot
export async function installTool(
  data: InstallToolInput
): Promise<ActionResponse> {
  try {
    const { botId, toolId, config = {} } = data;

    // Get the authenticated user
    const user = await requireAuth();

    // Verify tool exists
    const tool = await prisma.tool.findUnique({
      where: { id: toolId },
    });

    if (!tool) {
      return {
        success: false,
        error: { ...appErrors.NOT_FOUND, message: "Tool not found" },
      };
    }

    if (!tool.isActive) {
      return {
        success: false,
        error: { ...appErrors.INVALID_INPUT, message: "Tool is not active" },
      };
    }

    // Verify bot exists and belongs to the user
    const bot = await prisma.bot.findFirst({
      where: {
        id: botId,
        userId: user.id,
      },
    });

    if (!bot) {
      return {
        success: false,
        error: {
          ...appErrors.NOT_FOUND,
          message: "Bot not found or unauthorized",
        },
      };
    }

    // Get tool definition from registry
    const toolDef = toolRegistry.get(toolId);

    if (!toolDef) {
      return {
        success: false,
        error: {
          ...appErrors.UNEXPECTED_ERROR,
          message: "Tool implementation not found",
        },
      };
    }

    // Validate configuration against schema
    try {
      toolDef.configSchema.parse(config);
    } catch (validationError) {
      console.error("Validation error:", validationError);
      return {
        success: false,
        error: {
          code: appErrors.INVALID_INPUT.code,
          message: "Invalid tool configuration",
        },
      };
    }

    // Check if tool is already installed
    const existingBotTool = await prisma.botTool.findUnique({
      where: {
        botId_toolId: {
          botId,
          toolId,
        },
      },
    });

    let botTool;

    if (existingBotTool) {
      // Update existing bot tool
      botTool = await prisma.botTool.update({
        where: { id: existingBotTool.id },
        data: {
          config: config as InputJsonValue,
          isEnabled: true,
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new bot tool
      botTool = await prisma.botTool.create({
        data: {
          botId,
          toolId,
          config: config as InputJsonValue,
          isEnabled: true,
        },
      });
    }

    // Revalidate relevant tags
    revalidateTag(`bot_${botId}`);
    revalidateTag(`bot_tools_${botId}`);

    return {
      success: true,
      data: botTool,
    };
  } catch (error) {
    console.error("Error installing tool:", error);
    return {
      success: false,
      error: appErrors.UNEXPECTED_ERROR,
    };
  }
}

// Action to update tool status (enable/disable)
export async function updateToolStatus(
  data: UpdateToolStatusInput
): Promise<ActionResponse> {
  try {
    const { botId, toolId, enabled } = data;

    // Get the authenticated user
    const user = await requireAuth();

    // Verify bot exists and belongs to user
    const bot = await prisma.bot.findFirst({
      where: {
        id: botId,
        userId: user.id,
      },
    });

    if (!bot) {
      return {
        success: false,
        error: {
          ...appErrors.NOT_FOUND,
          message: "Bot not found or unauthorized",
        },
      };
    }

    // Check if the bot tool exists
    const botTool = await prisma.botTool.findUnique({
      where: {
        botId_toolId: {
          botId,
          toolId,
        },
      },
    });

    if (!botTool) {
      return {
        success: false,
        error: {
          ...appErrors.NOT_FOUND,
          message: "Tool not installed on this bot",
        },
      };
    }

    // Update the enabled status
    const updatedBotTool = await prisma.botTool.update({
      where: { id: botTool.id },
      data: {
        isEnabled: enabled,
        updatedAt: new Date(),
      },
    });

    // Revalidate relevant tags
    revalidateTag(`bot_${botId}`);
    revalidateTag(`bot_tools_${botId}`);

    return {
      success: true,
      data: updatedBotTool,
    };
  } catch (error) {
    console.error("Error updating tool status:", error);
    return {
      success: false,
      error: appErrors.UNEXPECTED_ERROR,
    };
  }
}

// Action to uninstall a tool
export async function uninstallTool(
  data: UninstallToolInput
): Promise<ActionResponse> {
  try {
    const { botId, toolId } = data;

    // Get the authenticated user
    const user = await requireAuth();

    // Verify bot exists and belongs to user
    const bot = await prisma.bot.findFirst({
      where: {
        id: botId,
        userId: user.id,
      },
    });

    if (!bot) {
      return {
        success: false,
        error: {
          ...appErrors.NOT_FOUND,
          message: "Bot not found or unauthorized",
        },
      };
    }

    // Check if the bot tool exists
    const botTool = await prisma.botTool.findUnique({
      where: {
        botId_toolId: {
          botId,
          toolId,
        },
      },
    });

    if (!botTool) {
      return {
        success: false,
        error: {
          ...appErrors.NOT_FOUND,
          message: "Tool not installed on this bot",
        },
      };
    }

    // Delete the bot tool
    await prisma.botTool.delete({
      where: { id: botTool.id },
    });

    // Revalidate relevant tags
    revalidateTag(`bot_${botId}`);
    revalidateTag(`bot_tools_${botId}`);

    return {
      success: true,
      data: { message: "Tool uninstalled successfully" },
    };
  } catch (error) {
    console.error("Error uninstalling tool:", error);
    return {
      success: false,
      error: appErrors.UNEXPECTED_ERROR,
    };
  }
}
