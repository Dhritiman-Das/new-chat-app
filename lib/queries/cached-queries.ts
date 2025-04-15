import { unstable_cache } from "next/cache";
import { PrismaClient } from "@/lib/generated/prisma";
import {
  getUserBotsQuery,
  getUserActiveBotCountQuery,
  getUserKnowledgeBaseCountQuery,
  getRecentConversationsQuery,
  getUserOrganizationsQuery,
  getOrganizationBotsQuery,
  getOrganizationActiveBotCountQuery,
} from "./index";
import { requireAuth } from "@/utils/auth";

// Initialize Prisma client
const prisma = new PrismaClient();

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
    ["active_bot_count", userId],
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
