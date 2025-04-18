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
