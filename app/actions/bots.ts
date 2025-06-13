"use server";

// import { z } from 'zod';
import { requireAuth } from "@/utils/auth";
import { revalidateTag } from "next/cache";
import { ActionResponse, appErrors } from "./types";
import { prisma } from "@/lib/db/prisma";
import { toolRegistry } from "@/lib/tools";
import { initializeToolsSync } from "@/lib/tools";
import { InputJsonValue } from "@/lib/generated/prisma/runtime/library";
import {
  hasAvailableBotSlots,
  canActivateBot,
} from "@/lib/payment/bot-limit-service";
import * as CACHE_TAGS from "@/lib/constants/cache-tags";

// Initialize tools
initializeToolsSync();

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
  defaultModelId?: string | null;
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

// Iframe configuration type
type IframeConfigInput = {
  botId: string;
  config: Record<string, unknown>;
};

// Integration types
type CreateIntegrationInput = {
  userId: string;
  botId: string;
  name: string;
  provider: string;
  type: "CRM" | "CALENDAR" | "MESSENGER" | "EMAIL" | "DOCUMENT" | "OTHER";
  authCredentials: Record<string, unknown>;
};

type LinkIntegrationToBotInput = {
  botId: string;
  integrationId: string;
  config?: Record<string, unknown>;
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

    // Check if the organization has available bot slots
    const hasAvailable = await hasAvailableBotSlots(data.organizationId);

    // Determine if bot should be created as active based on available slots
    const shouldBeActive = hasAvailable;

    // Create the bot - if no slots available, create as inactive
    const bot = await prisma.bot.create({
      data: {
        name: data.name,
        description: data.description || null,
        systemPrompt: data.systemPrompt,
        userId: user.id,
        organizationId: data.organizationId,
        isActive: shouldBeActive,
      },
    });

    // Revalidate the user bots cache
    revalidateTag(CACHE_TAGS.USER_BOTS(user.id));
    revalidateTag(CACHE_TAGS.ORGANIZATION_BOTS(data.organizationId));

    return {
      success: true,
      data: {
        ...bot,
        // Include a flag to indicate if the bot was created as inactive due to limits
        createdAsInactive: !shouldBeActive,
        message: !shouldBeActive
          ? "Bot created successfully but set to inactive due to plan limits. Please upgrade your plan or deactivate other bots to activate this one."
          : undefined,
      },
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

    // If trying to activate the bot, check if it would exceed the plan limits
    if (data.isActive === true && !existingBot.isActive) {
      const canActivate = await canActivateBot(
        existingBot.organizationId,
        data.id
      );
      if (!canActivate) {
        return {
          success: false,
          error: {
            code: "BOT_LIMIT_EXCEEDED",
            message:
              "You have reached the maximum number of active bots allowed for your plan. Please upgrade or deactivate other bots first.",
          },
        };
      }
    }

    // Update the bot
    const bot = await prisma.bot.update({
      where: {
        id: data.id,
      },
      data: {
        name: data.name,
        description: data.description,
        systemPrompt: data.systemPrompt,
        defaultModelId: data.defaultModelId,
        isActive: data.isActive,
      },
    });

    // Revalidate the user bots cache
    revalidateTag(CACHE_TAGS.USER_BOTS(user.id));
    revalidateTag(CACHE_TAGS.BOT(data.id));

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
    revalidateTag(CACHE_TAGS.USER_BOTS(user.id));
    revalidateTag(CACHE_TAGS.ORGANIZATION_BOTS(existingBot.organizationId));

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
      // Check if the botTool should have a credential_id connected
      if (toolDef.auth?.required) {
        // Check if the bot has a credential for this provider
        const credential = await prisma.credential.findFirst({
          where: {
            botId,
            provider: toolDef.auth.provider,
          },
        });
        if (credential) {
          await prisma.botTool.update({
            where: { id: botTool.id },
            data: { credentialId: credential.id },
          });
        }
      }
    }

    // Revalidate relevant tags
    revalidateTag(CACHE_TAGS.BOT(botId));
    revalidateTag(CACHE_TAGS.BOT_TOOLS(botId));

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
    revalidateTag(CACHE_TAGS.BOT(botId));
    revalidateTag(CACHE_TAGS.BOT_TOOLS(botId));

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
    revalidateTag(CACHE_TAGS.BOT(botId));
    revalidateTag(CACHE_TAGS.BOT_TOOLS(botId));

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

// Action to save iframe configuration
export async function saveIframeConfiguration(
  data: IframeConfigInput
): Promise<ActionResponse> {
  try {
    if (!data.botId) {
      return {
        success: false,
        error: { ...appErrors.INVALID_INPUT, message: "Bot ID is required" },
      };
    }

    // Get the authenticated user
    const user = await requireAuth();

    // Check if the bot exists and belongs to the user's organization
    const existingBot = await prisma.bot.findFirst({
      where: {
        id: data.botId,
        organization: {
          users: {
            some: {
              userId: user.id,
            },
          },
        },
      },
    });

    if (!existingBot) {
      return {
        success: false,
        error: appErrors.NOT_FOUND,
      };
    }

    // Check if there's an existing deployment
    let deployment = await prisma.deployment.findFirst({
      where: {
        botId: data.botId,
        type: "WEBSITE",
      },
    });

    // If no deployment exists, create one
    if (!deployment) {
      deployment = await prisma.deployment.create({
        data: {
          botId: data.botId,
          type: "WEBSITE",
          status: "ACTIVE",
          config: data.config as InputJsonValue,
        },
      });
    } else {
      // Otherwise update the existing deployment
      deployment = await prisma.deployment.update({
        where: {
          id: deployment.id,
        },
        data: {
          config: data.config as InputJsonValue,
          status: "ACTIVE",
        },
      });
    }

    // Revalidate the bot cache
    revalidateTag(CACHE_TAGS.BOT(data.botId));
    revalidateTag(CACHE_TAGS.BOT_DEPLOYMENTS(data.botId));

    return {
      success: true,
      data: deployment,
    };
  } catch (error) {
    console.error("Error saving iframe configuration:", error);
    return {
      success: false,
      error: appErrors.UNEXPECTED_ERROR,
    };
  }
}

// Action to create a new integration
export async function createIntegration(
  data: CreateIntegrationInput
): Promise<ActionResponse> {
  try {
    // Validate input
    if (
      !data.userId ||
      !data.name ||
      !data.provider ||
      !data.type ||
      !data.botId
    ) {
      return {
        success: false,
        error: {
          ...appErrors.INVALID_INPUT,
          message: "All integration fields are required",
        },
      };
    }

    // Get the authenticated user
    const user = await requireAuth();

    // Check if the user is the same as the authenticated user
    if (user.id !== data.userId) {
      return {
        success: false,
        error: appErrors.UNAUTHORIZED,
      };
    }

    // Check if the bot belongs to the user
    const bot = await prisma.bot.findFirst({
      where: {
        id: data.botId,
        userId: user.id,
      },
    });

    if (!bot) {
      return {
        success: false,
        error: appErrors.UNAUTHORIZED,
      };
    }

    // Create the integration
    const integration = await prisma.integration.create({
      data: {
        userId: data.userId,
        botId: data.botId,
        name: data.name,
        provider: data.provider,
        type: data.type,
        authCredentials: data.authCredentials as InputJsonValue,
      },
    });

    // Revalidate the user integrations cache
    revalidateTag(CACHE_TAGS.USER_INTEGRATIONS(user.id));
    revalidateTag(CACHE_TAGS.BOT_INTEGRATIONS(data.botId));

    return {
      success: true,
      data: integration,
    };
  } catch (error) {
    console.error("Error creating integration:", error);
    return {
      success: false,
      error: appErrors.UNEXPECTED_ERROR,
    };
  }
}

// Action to link an integration to a bot
export async function linkIntegrationToBot(
  data: LinkIntegrationToBotInput
): Promise<ActionResponse> {
  try {
    // Validate input
    if (!data.botId || !data.integrationId) {
      return {
        success: false,
        error: {
          ...appErrors.INVALID_INPUT,
          message: "Bot ID and Integration ID are required",
        },
      };
    }

    // Get the authenticated user
    const user = await requireAuth();

    // Check if the bot belongs to the user
    const bot = await prisma.bot.findFirst({
      where: {
        id: data.botId,
        userId: user.id,
      },
    });

    if (!bot) {
      return {
        success: false,
        error: appErrors.UNAUTHORIZED,
      };
    }

    // Check if the integration belongs to the user
    const integration = await prisma.integration.findFirst({
      where: {
        id: data.integrationId,
        userId: user.id,
      },
    });

    if (!integration) {
      return {
        success: false,
        error: appErrors.UNAUTHORIZED,
      };
    }

    // Update the integration with botId and config
    const updatedIntegration = await prisma.integration.update({
      where: {
        id: data.integrationId,
      },
      data: {
        botId: data.botId,
        config: (data.config as InputJsonValue) || {},
      },
    });

    // Revalidate the bot cache
    revalidateTag(CACHE_TAGS.BOT(data.botId));
    revalidateTag(CACHE_TAGS.BOT_INTEGRATIONS(data.botId));

    return {
      success: true,
      data: updatedIntegration,
    };
  } catch (error) {
    console.error("Error linking integration to bot:", error);
    return {
      success: false,
      error: appErrors.UNEXPECTED_ERROR,
    };
  }
}
