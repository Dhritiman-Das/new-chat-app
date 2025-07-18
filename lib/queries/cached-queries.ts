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
  getMeQuery,
  checkOrganizationSlugAvailabilityQuery,
  getBotDetailsQuery,
  getConversationStatusCountsQuery,
  getConversationsQuery,
  getConversationSourcesQuery,
  getInstalledDeploymentsQuery,
  getBotAppointmentsQuery,
  getUserBotsGroupedByOrgQuery,
  getBotCountsQuery,
  getBotAllToolsQuery,
} from "./index";
import { requireAuth } from "@/utils/auth";
import { prisma } from "@/lib/db/prisma";
import { getOrganizationInvoicesQuery } from "./index";
import * as CACHE_TAGS from "@/lib/constants/cache-tags";

export const getMe = async () => {
  const user = await requireAuth();
  const userId = user.id;

  return getMeQuery(prisma, userId);
};

// Get organization invoices with caching
export const getOrganizationInvoices = async (
  organizationId: string,
  page = 1,
  pageSize = 10
) => {
  await requireAuth();

  return unstable_cache(
    async () => {
      return getOrganizationInvoicesQuery(
        prisma,
        organizationId,
        page,
        pageSize
      );
    },
    [
      "organization_invoices",
      organizationId,
      page.toString(),
      pageSize.toString(),
    ],
    {
      tags: [CACHE_TAGS.ORGANIZATION_INVOICES(organizationId)],
      revalidate: 60, // Cache for 1 minute
    }
  )();
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
      tags: [CACHE_TAGS.USER_ORGS(userId)],
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
      tags: [CACHE_TAGS.ORGANIZATION_BOTS(organizationId)],
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
      tags: [CACHE_TAGS.USER_BOTS(userId)],
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
      tags: [CACHE_TAGS.ORGANIZATION_BOTS(organizationId)],
      revalidate: 60, // Cache for 1 minute
    }
  )();
};

export const getOrganizationById = async (organizationId: string) => {
  await requireAuth();

  return unstable_cache(
    async () => {
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { id: true, name: true, slug: true, logoUrl: true },
      });

      return { data: organization };
    },
    ["organization", organizationId],
    {
      tags: [CACHE_TAGS.ORGANIZATION(organizationId)],
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
      tags: [CACHE_TAGS.USER_BOTS(userId)],
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
      tags: [CACHE_TAGS.USER_KNOWLEDGE_BASES(userId)],
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
      tags: [CACHE_TAGS.USER_CONVERSATIONS(userId)],
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
      tags: [CACHE_TAGS.BOT(botId)],
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
      tags: [CACHE_TAGS.BOT(botId), CACHE_TAGS.BOT_TOOLS(botId)],
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
      tags: [CACHE_TAGS.ORGANIZATION_SLUGS],
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
          bot: {
            include: {
              knowledgeBases: {
                include: {
                  files: true,
                  websiteSources: true,
                },
              },
            },
          },
          // Include leads and appointments
          leads: true,
          appointments: true,
        },
      });

      return { data: fullConversation };
    },
    [`conversation_${conversationId}`, userId],
    {
      tags: [
        CACHE_TAGS.CONVERSATION(conversationId),
        CACHE_TAGS.USER_CONVERSATIONS(userId),
      ],
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
      tags: [CACHE_TAGS.BOT_CONVERSATIONS(botId)],
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
      tags: [
        CACHE_TAGS.BOT_CONVERSATIONS(botId),
        CACHE_TAGS.USER_CONVERSATIONS(userId),
      ],
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
      tags: [
        CACHE_TAGS.BOT_CONVERSATIONS(botId),
        CACHE_TAGS.USER_CONVERSATIONS(userId),
      ],
      revalidate: 60 * 5, // Cache for 5 minutes
    }
  )();
};

// Cache bot details with tools and knowledge bases
export const getBotDetails = async (botId: string, bypassAuth = false) => {
  if (!bypassAuth) {
    await requireAuth();
  }

  return unstable_cache(
    async () => {
      return getBotDetailsQuery(prisma, botId);
    },
    ["bot_details", botId],
    {
      tags: [
        CACHE_TAGS.BOT(botId),
        CACHE_TAGS.BOT_TOOLS(botId),
        CACHE_TAGS.BOT_KNOWLEDGE_BASES(botId),
      ],
      revalidate: 60, // Cache for 1 minute
    }
  )();
};

/**
 * Cache wrapper for conversation status counts
 */
export const getCachedConversationStatusCounts = async (botId: string) => {
  // Authentication not checked here as it's common to get status counts for public bots
  return unstable_cache(
    async () => {
      const statusCounts = await getConversationStatusCountsQuery(
        prisma,
        botId
      );
      return statusCounts; // Return directly without wrapping in {data: ...}
    },
    ["conversation-status-counts", botId],
    { tags: [CACHE_TAGS.BOT_CONVERSATION_STATUS(botId)], revalidate: 60 }
  )();
};

/**
 * Cache wrapper for filtered conversations
 */
export const getCachedConversations = async (
  botId: string,
  page = 1,
  per_page = 10,
  sort?: string,
  filters?: string | object,
  search?: string
) => {
  await requireAuth();

  // Ensure filters is a string by JSON.stringify if it's an object
  const filtersStr =
    typeof filters === "object" ? JSON.stringify(filters) : filters;

  return unstable_cache(
    async () => {
      return getConversationsQuery(
        prisma,
        botId,
        page,
        per_page,
        sort,
        filtersStr,
        search
      );
    },
    [
      "conversations",
      botId,
      page.toString(),
      per_page.toString(),
      sort || "default",
      filtersStr || "none",
      search || "none",
    ],
    {
      tags: [CACHE_TAGS.BOT_CONVERSATIONS(botId)],
      revalidate: 60,
    }
  )();
};

/**
 * Cache wrapper for conversation sources
 */
export const getCachedConversationSources = async (botId: string) => {
  await requireAuth();

  return unstable_cache(
    async () => {
      return { data: await getConversationSourcesQuery(prisma, botId) };
    },
    ["conversation-sources", botId],
    { tags: [CACHE_TAGS.BOT_CONVERSATION_SOURCES(botId)], revalidate: 60 }
  )();
};

// Get iframe configuration for a bot
export async function getIframeConfigForBot(botId: string) {
  try {
    const deployment = await prisma.deployment.findFirst({
      where: {
        botId: botId,
        type: "WEBSITE",
      },
    });

    return {
      success: true,
      data: deployment ? deployment.config : null,
    };
  } catch (error) {
    console.error(`Error fetching iframe config for bot ${botId}:`, error);
    return {
      success: false,
      data: null,
    };
  }
}

export const getInstalledDeployments = async (botId: string) => {
  await requireAuth();

  return unstable_cache(
    async () => {
      return { data: await getInstalledDeploymentsQuery(prisma, botId) };
    },
    ["installed-deployments", botId],
    { tags: [CACHE_TAGS.BOT_DEPLOYMENTS(botId)], revalidate: 60 }
  )();
};

export const getBotAppointments = async (
  botId: string,
  page = 1,
  limit = 10
) => {
  // Ensure the user is authenticated
  await requireAuth();

  return unstable_cache(
    async () => {
      return getBotAppointmentsQuery(prisma, botId, page, limit);
    },
    ["bot_appointments", botId, page.toString(), limit.toString()],
    {
      tags: [CACHE_TAGS.BOT_APPOINTMENTS(botId)],
      revalidate: 30, // Cache for 30 seconds since appointments might be updated frequently
    }
  )();
};

// Cache user's bots grouped by organizations
export const getUserBotsGroupedByOrg = async () => {
  const user = await requireAuth();
  const userId = user.id;

  return unstable_cache(
    async () => {
      return getUserBotsGroupedByOrgQuery(prisma, userId);
    },
    ["user_bots_grouped", userId],
    {
      tags: [CACHE_TAGS.USER_BOTS(userId), CACHE_TAGS.USER_ORGS(userId)],
      revalidate: 60, // Cache for 1 minute
    }
  )();
};

// Cache bot counts
export const getBotCounts = async (botId: string) => {
  await requireAuth();

  return unstable_cache(
    async () => {
      return getBotCountsQuery(prisma, botId);
    },
    ["bot_counts", botId],
    {
      tags: [
        CACHE_TAGS.BOT(botId),
        CACHE_TAGS.BOT_TOOLS(botId),
        CACHE_TAGS.BOT_KNOWLEDGE_BASES(botId),
        CACHE_TAGS.BOT_DEPLOYMENTS(botId),
        CACHE_TAGS.BOT_CONVERSATIONS(botId),
      ],
      revalidate: 30, // Cache for 30 seconds since these counts might change frequently
    }
  )();
};

// Get all bot tools including disabled ones
export const getBotAllTools = async (botId: string) => {
  await requireAuth();

  return unstable_cache(
    async () => {
      return getBotAllToolsQuery(prisma, botId);
    },
    ["bot_all_tools", botId],
    {
      tags: [CACHE_TAGS.BOT(botId), CACHE_TAGS.BOT_TOOLS(botId)],
      revalidate: 30, // Cache for 30 seconds
    }
  )();
};

// Get message credit packs available for purchase
export const getMessageCreditPacks = async () => {
  await requireAuth();

  return unstable_cache(
    async () => {
      const creditPacks = await prisma.addOn.findMany({
        where: {
          feature: {
            name: "message_credits",
          },
        },
        orderBy: {
          unitPrice: "asc",
        },
      });

      return { data: creditPacks };
    },
    ["message_credit_packs"],
    {
      tags: [CACHE_TAGS.ADD_ONS, CACHE_TAGS.MESSAGE_CREDITS],
      revalidate: 3600, // Cache for 1 hour since these don't change often
    }
  )();
};

// Get agent add-ons available for purchase
export const getAgentAddOns = async () => {
  await requireAuth();

  return unstable_cache(
    async () => {
      const agentAddOns = await prisma.addOn.findMany({
        where: {
          feature: {
            name: "agents",
          },
        },
        orderBy: {
          unitPrice: "asc",
        },
      });

      return { data: agentAddOns };
    },
    ["agent_add_ons"],
    {
      tags: [CACHE_TAGS.ADD_ONS, CACHE_TAGS.AGENT_ADD_ONS],
      revalidate: 3600, // Cache for 1 hour
    }
  )();
};
