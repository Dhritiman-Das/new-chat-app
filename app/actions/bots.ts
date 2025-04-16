"use server";

// import { z } from 'zod';
import { requireAuth } from "@/utils/auth";
import { revalidateTag } from "next/cache";
import { ActionResponse, appErrors } from "./types";
import { prisma } from "@/lib/db/prisma";

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
