import { PrismaClient } from "@/lib/generated/prisma";

export async function getUserOrganizationsQuery(
  prisma: PrismaClient,
  userId: string
) {
  const userOrgs = await prisma.userOrganization.findMany({
    where: {
      userId: userId,
    },
    include: {
      organization: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return {
    data: userOrgs.map((userOrg) => ({
      ...userOrg.organization,
      role: userOrg.role,
    })),
  };
}

export async function getOrganizationBotsQuery(
  prisma: PrismaClient,
  organizationId: string
) {
  const bots = await prisma.bot.findMany({
    where: {
      organizationId: organizationId,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return {
    data: bots,
  };
}

export async function getUserBotsQuery(prisma: PrismaClient, userId: string) {
  const bots = await prisma.bot.findMany({
    where: {
      userId: userId,
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return {
    data: bots,
  };
}

export async function getUserActiveBotCountQuery(
  prisma: PrismaClient,
  userId: string
) {
  const count = await prisma.bot.count({
    where: {
      userId: userId,
      isActive: true,
    },
  });

  return {
    data: count,
  };
}

export async function getBotByIdQuery(prisma: PrismaClient, botId: string) {
  const bot = await prisma.bot.findUnique({
    where: {
      id: botId,
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
        },
      },
    },
  });

  return {
    data: bot,
  };
}

export async function getBotToolQuery(
  prisma: PrismaClient,
  botId: string,
  toolId: string
) {
  const botTool = await prisma.botTool.findUnique({
    where: {
      botId_toolId: {
        botId,
        toolId,
      },
    },
    include: {
      tool: true,
    },
  });

  return {
    data: botTool,
  };
}

export async function getOrganizationActiveBotCountQuery(
  prisma: PrismaClient,
  organizationId: string
) {
  const count = await prisma.bot.count({
    where: {
      organizationId: organizationId,
      isActive: true,
    },
  });

  return {
    data: count,
  };
}

export async function getUserKnowledgeBaseCountQuery(
  prisma: PrismaClient,
  userId: string
) {
  const count = await prisma.knowledgeBase.count({
    where: {
      bot: {
        userId: userId,
      },
    },
  });

  return {
    data: count,
  };
}

export async function getRecentConversationsQuery(
  prisma: PrismaClient,
  userId: string,
  limit = 5
) {
  // Get the user's bot IDs first
  const userBots = await prisma.bot.findMany({
    where: {
      userId: userId,
    },
    select: {
      id: true,
    },
  });

  const botIds = userBots.map((bot) => bot.id);

  // Then get conversations for those bots
  const conversations = await prisma.conversation.findMany({
    where: {
      botId: {
        in: botIds,
      },
    },
    include: {
      messages: {
        take: 1,
        orderBy: {
          timestamp: "desc",
        },
      },
    },
    orderBy: {
      startedAt: "desc",
    },
    take: limit,
  });

  return {
    data: conversations,
  };
}

export async function getToolCredentialQuery(
  prisma: PrismaClient,
  toolId: string,
  userId: string,
  provider: string
) {
  const credential = await prisma.toolCredential.findFirst({
    where: {
      toolId,
      userId,
      provider,
    },
  });

  return {
    data: credential,
  };
}
