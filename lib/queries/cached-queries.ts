import { unstable_cache } from "next/cache";
import {
  getUserBotsQuery,
  getUserActiveBotCountQuery,
  getUserKnowledgeBaseCountQuery,
  getRecentConversationsQuery,
  getUserOrganizationsQuery,
  getOrganizationBotsQuery,
  getOrganizationActiveBotCountQuery,
  getBotByIdQuery,
  getBotToolQuery,
  getToolCredentialQuery,
  getMeQuery,
  checkOrganizationSlugAvailabilityQuery,
  getBotDetailsQuery,
} from "./index";
import { requireAuth } from "@/utils/auth";
import { prisma } from "@/lib/db/prisma";

export const getMe = async () => {
  const user = await requireAuth();
  const userId = user.id;

  return getMeQuery(prisma, userId);
};

// Cache user's organizations
export const getUserOrganizations = async () => {
  const user = await requireAuth();
  const userId = user.id;

  return unstable_cache(
    async () => {
      return getUserOrganizationsQuery(prisma, userId);
    },
    ["user_organizations", userId],
    {
      tags: [`user_organizations_${userId}`],
      revalidate: 60, // Cache for 1 minute
    }
  )();
};

// Cache organization's bots
export const getOrganizationBots = async (organizationId: string) => {
  // Ensure the user is authenticated (but we don't need the user variable)
  await requireAuth();

  return unstable_cache(
    async () => {
      return getOrganizationBotsQuery(prisma, organizationId);
    },
    ["organization_bots", organizationId],
    {
      tags: [`organization_bots_${organizationId}`],
      revalidate: 60, // Cache for 1 minute
    }
  )();
};

// Cache user's bots
export const getUserBots = async () => {
  const user = await requireAuth();
  const userId = user.id;

  return unstable_cache(
    async () => {
      return getUserBotsQuery(prisma, userId);
    },
    ["user_bots", userId],
    {
      tags: [`user_bots_${userId}`],
      revalidate: 60, // Cache for 1 minute
    }
  )();
};

// Cache active bot count for an organization
export const getOrganizationActiveBotCount = async (organizationId: string) => {
  // Ensure the user is authenticated (but we don't need the user variable)
  await requireAuth();

  return unstable_cache(
    async () => {
      return getOrganizationActiveBotCountQuery(prisma, organizationId);
    },
    ["organization_active_bot_count", organizationId],
    {
      tags: [`organization_bots_${organizationId}`],
      revalidate: 60, // Cache for 1 minute
    }
  )();
};

// Cache active bot count
export const getUserActiveBotCount = async () => {
  const user = await requireAuth();
  const userId = user.id;

  return unstable_cache(
    async () => {
      return getUserActiveBotCountQuery(prisma, userId);
    },
    ["user_active_bot_count", userId],
    {
      tags: [`user_bots_${userId}`],
      revalidate: 60, // Cache for 1 minute
    }
  )();
};

// Cache knowledge base count
export const getUserKnowledgeBaseCount = async () => {
  const user = await requireAuth();
  const userId = user.id;

  return unstable_cache(
    async () => {
      return getUserKnowledgeBaseCountQuery(prisma, userId);
    },
    ["knowledge_base_count", userId],
    {
      tags: [`user_knowledge_bases_${userId}`],
      revalidate: 60, // Cache for 1 minute
    }
  )();
};

// Cache recent conversations
export const getRecentConversations = async (limit = 5) => {
  const user = await requireAuth();
  const userId = user.id;

  return unstable_cache(
    async () => {
      return getRecentConversationsQuery(prisma, userId, limit);
    },
    ["recent_conversations", userId, limit.toString()],
    {
      tags: [`user_conversations_${userId}`],
      revalidate: 30, // Cache for 30 seconds (conversations update more frequently)
    }
  )();
};

// Cache bot by ID
export const getBotById = async (botId: string) => {
  await requireAuth();

  return unstable_cache(
    async () => {
      return getBotByIdQuery(prisma, botId);
    },
    ["bot", botId],
    {
      tags: [`bot_${botId}`],
      revalidate: 60, // Cache for 1 minute
    }
  )();
};

// Cache bot tool by bot ID and tool ID
export const getBotTool = async (botId: string, toolId: string) => {
  await requireAuth();

  return unstable_cache(
    async () => {
      return getBotToolQuery(prisma, botId, toolId);
    },
    ["bot_tool", botId, toolId],
    {
      tags: [`bot_${botId}`, `bot_tools_${botId}`],
      revalidate: 60, // Cache for 1 minute
    }
  )();
};

// Cache tool credential by tool ID, user ID and provider
export const getToolCredential = async (toolId: string, provider: string) => {
  const user = await requireAuth();
  const userId = user.id;

  return unstable_cache(
    async () => {
      return getToolCredentialQuery(prisma, toolId, userId, provider);
    },
    ["tool_credential", toolId, userId, provider],
    {
      tags: [
        `tool_credentials_${userId}`,
        `tool_credential_${toolId}_${provider}`,
      ],
      revalidate: 60, // Cache for 1 minute
    }
  )();
};

// Check if an organization slug is available
export const checkOrganizationSlugAvailability = async (
  slug: string,
  excludeOrgId?: string
) => {
  await requireAuth();

  return unstable_cache(
    async () => {
      return checkOrganizationSlugAvailabilityQuery(prisma, slug, excludeOrgId);
    },
    ["organization_slug_availability", slug, excludeOrgId || ""],
    {
      tags: [`organization_slugs`],
      revalidate: 5, // Cache for 5 seconds since we need this to be fairly up-to-date
    }
  )();
};

// Cache conversation by ID
export const getConversationById = async (conversationId: string) => {
  const user = await requireAuth();
  const userId = user.id;

  return unstable_cache(
    async () => {
      // First find the conversation with its botId
      const conversation = await prisma.conversation.findUnique({
        where: {
          id: conversationId,
        },
        select: {
          id: true,
          botId: true,
        },
      });

      if (!conversation) {
        return { data: null };
      }

      // Verify the user has access to the bot
      const bot = await prisma.bot.findFirst({
        where: {
          id: conversation.botId,
          userId,
        },
        select: {
          id: true,
        },
      });

      if (!bot) {
        return { data: null }; // User doesn't have access
      }

      // Now fetch the full conversation with details
      const fullConversation = await prisma.conversation.findUnique({
        where: {
          id: conversationId,
        },
        include: {
          messages: {
            orderBy: {
              timestamp: "asc",
            },
          },
        },
      });

      return { data: fullConversation };
    },
    [`conversation_${conversationId}`, userId],
    {
      tags: [`conversation_${conversationId}`, `user_conversations_${userId}`],
      revalidate: 60, // Cache for 60 seconds
    }
  )();
};

// Cache bot conversations with pagination
export const getBotConversations = async (
  botId: string,
  page = 1,
  pageSize = 20
) => {
  const user = await requireAuth();
  const userId = user.id;

  // Verify the user has access to this bot
  const bot = await prisma.bot.findFirst({
    where: {
      id: botId,
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!bot) {
    return { data: [] };
  }

  return unstable_cache(
    async () => {
      const skip = (page - 1) * pageSize;

      const [conversations, total] = await Promise.all([
        prisma.conversation.findMany({
          where: {
            botId,
          },
          orderBy: {
            startedAt: "desc",
          },
          include: {
            messages: {
              take: 1, // Just get latest message for preview
              orderBy: {
                timestamp: "desc",
              },
            },
            _count: {
              select: {
                messages: true,
              },
            },
          },
          skip,
          take: pageSize,
        }),
        prisma.conversation.count({
          where: {
            botId,
          },
        }),
      ]);

      return {
        data: conversations,
        pagination: {
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    },
    [`bot_conversations_${botId}_page_${page}_size_${pageSize}`, userId],
    {
      tags: [`bot_conversations_${botId}`, `user_conversations_${userId}`],
      revalidate: 30, // Cache for 30 seconds
    }
  )();
};

// Get conversations with tool execution data for a bot
export const getBotConversationsWithToolData = async (
  botId: string,
  page = 1,
  pageSize = 20
) => {
  const user = await requireAuth();
  const userId = user.id;

  // Verify the user has access to this bot
  const bot = await prisma.bot.findFirst({
    where: {
      id: botId,
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!bot) {
    return {
      data: [],
      pagination: {
        total: 0,
        page,
        pageSize,
        totalPages: 0,
      },
    };
  }

  return unstable_cache(
    async () => {
      const skip = (page - 1) * pageSize;

      const [conversations, total] = await Promise.all([
        prisma.conversation.findMany({
          where: {
            botId,
          },
          orderBy: {
            startedAt: "desc",
          },
          include: {
            messages: {
              take: 3, // Get last few messages for preview
              orderBy: {
                timestamp: "desc",
              },
            },
            _count: {
              select: {
                messages: true,
              },
            },
          },
          skip,
          take: pageSize,
        }),
        prisma.conversation.count({
          where: {
            botId,
          },
        }),
      ]);

      return {
        data: conversations,
        pagination: {
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    },
    [`bot_conversations_${botId}_page_${page}_size_${pageSize}`, userId],
    {
      tags: [`bot_conversations_${botId}`, `user_conversations_${userId}`],
      revalidate: 30, // Cache for 30 seconds
    }
  )();
};

// Get conversation metrics for a bot
export const getBotConversationMetrics = async (
  botId: string,
  startDate: Date,
  endDate: Date
) => {
  const user = await requireAuth();
  const userId = user.id;

  // Verify the user has access to this bot
  const bot = await prisma.bot.findFirst({
    where: {
      id: botId,
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!bot) {
    return { data: null };
  }

  return unstable_cache(
    async () => {
      // Get total conversations in date range
      const totalConversations = await prisma.conversation.count({
        where: {
          botId,
          startedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      // Get total messages
      const totalMessages = await prisma.message.count({
        where: {
          conversation: {
            botId,
            startedAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
      });

      // Get completed conversations count
      const completedConversations = await prisma.conversation.count({
        where: {
          botId,
          startedAt: {
            gte: startDate,
            lte: endDate,
          },
          endedAt: {
            not: null,
          },
          status: "COMPLETED",
        },
      });

      // Get abandoned conversations count
      const abandonedConversations = await prisma.conversation.count({
        where: {
          botId,
          startedAt: {
            gte: startDate,
            lte: endDate,
          },
          status: "ABANDONED",
        },
      });

      // Get failed conversations count
      const failedConversations = await prisma.conversation.count({
        where: {
          botId,
          startedAt: {
            gte: startDate,
            lte: endDate,
          },
          status: "FAILED",
        },
      });

      // Calculate average messages per conversation
      const avgMessagesPerConversation =
        totalConversations > 0 ? totalMessages / totalConversations : 0;

      return {
        data: {
          totalConversations,
          totalMessages,
          completedConversations,
          abandonedConversations,
          failedConversations,
          avgMessagesPerConversation,
        },
      };
    },
    [
      `bot_conversation_metrics_${botId}_${startDate.toISOString()}_${endDate.toISOString()}`,
      userId,
    ],
    {
      tags: [`bot_conversations_${botId}`, `user_conversations_${userId}`],
      revalidate: 60 * 5, // Cache for 5 minutes
    }
  )();
};

// Cache bot details with tools and knowledge bases
export const getBotDetails = async (botId: string) => {
  await requireAuth();

  return unstable_cache(
    async () => {
      return getBotDetailsQuery(prisma, botId);
    },
    ["bot_details", botId],
    {
      tags: [
        `bot_${botId}`,
        `bot_tools_${botId}`,
        `bot_knowledge_bases_${botId}`,
      ],
      revalidate: 60, // Cache for 1 minute
    }
  )();
};
