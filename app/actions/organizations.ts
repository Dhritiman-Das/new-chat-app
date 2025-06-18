"use server";

import { getUserOrganizations } from "@/lib/queries/cached-queries";
import { ActionResponse, appErrors } from "./types";
import {
  BillingCycle,
  PlanType,
  SubscriptionStatus,
} from "@/lib/generated/prisma";
import { requireAuth } from "@/utils/auth";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { checkOrganizationSlugAvailability } from "@/lib/queries/cached-queries";
import { createSafeActionClient } from "next-safe-action";
import { z } from "zod";
import { createCreditTransaction } from "@/lib/payment/billing-service";
import * as CACHE_TAGS from "@/lib/constants/cache-tags";
import { Conversation, Message } from "@/lib/generated/prisma";

// Create safe action client
const action = createSafeActionClient();

// Types for organization actions
type CreateOrganizationInput = {
  name: string;
  slug: string;
  plan?: string;
  logoUrl?: string;
};

type UpdateOrganizationInput = {
  id: string;
  name?: string;
  slug?: string;
  plan?: string;
  logoUrl?: string;
};

// Schema for slug validation
const slugSchema = z.object({
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, {
      message: "Slug must contain only lowercase letters, numbers, and hyphens",
    }),
  organizationId: z.string().optional(),
});

// Action to get user organizations
export async function getOrganizationsAction(): Promise<ActionResponse> {
  try {
    const { data: organizations } = await getUserOrganizations();

    return {
      success: true,
      data: organizations,
    };
  } catch (error) {
    console.error("Error fetching organizations:", error);
    return {
      success: false,
      error: appErrors.UNEXPECTED_ERROR,
    };
  }
}

// Action to create a new organization
export async function createOrganization(
  data: CreateOrganizationInput
): Promise<ActionResponse> {
  try {
    // Validate input
    if (!data.name || data.name.trim().length < 2) {
      return {
        success: false,
        error: {
          ...appErrors.INVALID_INPUT,
          message: "Organization name must be at least 2 characters",
        },
      };
    }

    if (!data.slug || !/^[a-z0-9-]+$/.test(data.slug)) {
      return {
        success: false,
        error: {
          ...appErrors.INVALID_INPUT,
          message:
            "Slug must contain only lowercase letters, numbers, and hyphens",
        },
      };
    }

    // Get the authenticated user
    const user = await requireAuth();

    // Check if slug is already taken
    const existingOrg = await prisma.organization.findUnique({
      where: {
        slug: data.slug,
      },
    });

    console.log({
      existingOrg,
      slug: data.slug,
      plan: data.plan,
      logoUrl: data.logoUrl,
      name: data.name,
      user,
    });

    if (existingOrg) {
      return {
        success: false,
        error: {
          ...appErrors.INVALID_INPUT,
          message: "This slug is already taken. Please choose another one.",
        },
      };
    }

    // Create organization and add user as owner
    const organization = await prisma.$transaction(async (tx) => {
      // Create the organization
      const org = await tx.organization.create({
        data: {
          name: data.name,
          slug: data.slug,
          plan: (data.plan as PlanType) || PlanType.HOBBY,
          logoUrl: data.logoUrl,
        },
      });

      // Add the user as an owner
      await tx.userOrganization.create({
        data: {
          userId: user.id,
          organizationId: org.id,
          role: "OWNER",
        },
      });

      // Create a subscription record with trial status
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 7); // 7-day trial

      await tx.subscription.create({
        data: {
          organizationId: org.id,
          planType: PlanType.HOBBY,
          status: SubscriptionStatus.TRIALING, // Use a specific status for trial
          billingCycle: BillingCycle.MONTHLY,
          currentPeriodStart: new Date(),
          currentPeriodEnd: trialEndDate,
        },
      });

      return org;
    });

    // Find the plan limits for message credits
    const planLimits = await prisma.planLimit.findFirst({
      where: {
        planType: (data.plan as PlanType) || PlanType.HOBBY,
        feature: {
          name: "message_credits",
        },
      },
      include: {
        feature: true,
      },
    });

    // Add initial credits if the plan has a defined limit
    if (planLimits && !planLimits.isUnlimited) {
      await createCreditTransaction(
        organization.id,
        planLimits.value,
        "PLAN_GRANT",
        "Initial plan credit allocation",
        { source: "organization_creation" }
      );
    }

    // Revalidate cache
    revalidateTag(CACHE_TAGS.USER_ORGS(user.id));

    return {
      success: true,
      data: organization,
    };
  } catch (error) {
    console.error("Error creating organization:", error);
    return {
      success: false,
      error: appErrors.UNEXPECTED_ERROR,
    };
  }
}

// Action to update an organization
export async function updateOrganization(
  data: UpdateOrganizationInput
): Promise<ActionResponse> {
  try {
    // Validate input
    if (!data.id) {
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

    // Check if the user is a member of the organization
    const userOrg = await prisma.userOrganization.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: data.id,
        },
      },
    });

    if (!userOrg) {
      return {
        success: false,
        error: appErrors.UNAUTHORIZED,
      };
    }

    // Check if slug is changing and if it's available
    if (data.slug) {
      const slugResult = await checkOrganizationSlugAvailability(
        data.slug,
        data.id
      );
      if (!slugResult.data.available) {
        return {
          success: false,
          error: {
            ...appErrors.INVALID_INPUT,
            message: "This slug is already taken. Please choose another one.",
          },
        };
      }
    }

    // Update the organization
    const updateData: Record<string, string | PlanType | null> = {};
    if (data.name) updateData.name = data.name;
    if (data.slug) updateData.slug = data.slug;
    if (data.plan) updateData.plan = data.plan as PlanType;
    if (data.logoUrl !== undefined) updateData.logoUrl = data.logoUrl;

    const organization = await prisma.organization.update({
      where: {
        id: data.id,
      },
      data: updateData,
    });

    // Revalidate cache
    revalidateTag(CACHE_TAGS.USER_ORGS(user.id));

    return {
      success: true,
      data: organization,
    };
  } catch (error) {
    console.error("Error updating organization:", error);
    return {
      success: false,
      error: appErrors.UNEXPECTED_ERROR,
    };
  }
}

// Action to check slug availability
export const checkSlugAvailability = action
  .schema(slugSchema)
  .action(
    async ({
      parsedInput,
    }): Promise<ActionResponse<{ available: boolean; slug: string }>> => {
      try {
        const { slug, organizationId } = parsedInput;

        // Check if slug is available
        const { data } = await checkOrganizationSlugAvailability(
          slug,
          organizationId
        );

        return {
          success: true,
          data,
        };
      } catch (error) {
        console.error("Error checking slug availability:", error);
        return {
          success: false,
          error: appErrors.UNEXPECTED_ERROR,
        };
      }
    }
  );

// Schema for getting playground conversations
const getPlaygroundConversationsSchema = z.object({
  botId: z.string(),
  limit: z.number().int().positive().optional().default(20),
});

// Schema for getting conversation messages
const getConversationMessagesSchema = z.object({
  conversationId: z.string(),
});

// Action to get playground conversations for a bot
export const getPlaygroundConversations = action
  .schema(getPlaygroundConversationsSchema)
  .action(async ({ parsedInput }): Promise<ActionResponse<Conversation[]>> => {
    try {
      const { botId, limit } = parsedInput;

      // Get the authenticated user
      const user = await requireAuth();

      // Check if the user has access to this bot
      const bot = await prisma.bot.findFirst({
        where: {
          id: botId,
          userId: user.id,
        },
        select: {
          id: true,
        },
      });

      if (!bot) {
        return {
          success: false,
          error: appErrors.UNAUTHORIZED,
        };
      }

      // Get playground conversations for the bot
      const conversations = await prisma.conversation.findMany({
        where: {
          botId,
          source: "playground",
        },
        orderBy: {
          startedAt: "desc",
        },
        take: limit,
        include: {
          messages: {
            take: 1, // Get the last message for preview
            orderBy: {
              timestamp: "desc",
            },
            select: {
              content: true,
              timestamp: true,
            },
          },
          _count: {
            select: {
              messages: true,
            },
          },
        },
      });

      return {
        success: true,
        data: conversations,
      };
    } catch (error) {
      console.error("Error fetching playground conversations:", error);
      return {
        success: false,
        error: appErrors.UNEXPECTED_ERROR,
      };
    }
  });

// Action to get messages for a specific conversation
export const getConversationMessages = action
  .schema(getConversationMessagesSchema)
  .action(async ({ parsedInput }): Promise<ActionResponse<Message[]>> => {
    try {
      const { conversationId } = parsedInput;

      // Get the authenticated user
      const user = await requireAuth();

      // First check if the conversation exists and user has access
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          bot: {
            userId: user.id,
          },
        },
        select: {
          id: true,
          botId: true,
        },
      });

      if (!conversation) {
        return {
          success: false,
          error: appErrors.NOT_FOUND,
        };
      }

      // Get all messages for this conversation
      const messages = await prisma.message.findMany({
        where: {
          conversationId,
        },
        orderBy: {
          timestamp: "asc",
        },
      });

      return {
        success: true,
        data: messages,
      };
    } catch (error) {
      console.error("Error fetching conversation messages:", error);
      return {
        success: false,
        error: appErrors.UNEXPECTED_ERROR,
      };
    }
  });
