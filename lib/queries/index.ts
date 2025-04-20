import { PrismaClient } from "@/lib/generated/prisma";

export async function getMeQuery(prisma: PrismaClient, userId: string) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  return {
    data: user,
  };
}

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
          firstName: true,
          lastName: true,
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

export async function checkOrganizationSlugAvailabilityQuery(
  prisma: PrismaClient,
  slug: string,
  excludeOrgId?: string
) {
  // If we're updating an existing organization, we need to exclude it from the check
  // to prevent false positives when the slug hasn't changed
  const existingOrg = await prisma.organization.findFirst({
    where: {
      slug,
      ...(excludeOrgId ? { id: { not: excludeOrgId } } : {}),
    },
    select: {
      id: true,
    },
  });

  return {
    data: {
      available: !existingOrg,
      slug,
    },
  };
}

/**
 * Get a conversation by ID with messages
 */
export async function getConversationByIdQuery(
  prisma: PrismaClient,
  conversationId: string
) {
  try {
    const conversation = await prisma.conversation.findUnique({
      where: {
        id: conversationId,
      },
      include: {
        messages: {
          orderBy: {
            timestamp: "asc",
          },
        },
        // Get tool executions at conversation level instead
        toolExecutions: true,
      },
    });

    if (!conversation) {
      return { data: null };
    }

    return { data: conversation };
  } catch (error) {
    console.error("Error fetching conversation:", error);
    throw error;
  }
}

/**
 * Get all conversations for a bot with optional pagination
 */
export async function getBotConversationsQuery(
  prisma: PrismaClient,
  botId: string,
  page = 1,
  pageSize = 20
) {
  try {
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
  } catch (error) {
    console.error("Error fetching bot conversations:", error);
    throw error;
  }
}

/**
 * Get tool execution metrics for a bot within a time range
 */
export async function getBotToolMetricsQuery(
  prisma: PrismaClient,
  botId: string,
  startDate: Date,
  endDate: Date
) {
  try {
    // Get conversation IDs for the bot within the time range
    const conversations = await prisma.conversation.findMany({
      where: {
        botId,
        startedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: { id: true },
    });

    const conversationIds = conversations.map((c) => c.id);

    // Early return if no conversations
    if (conversationIds.length === 0) {
      return { data: [] };
    }

    // Get all tool executions for these conversations
    const toolExecutions = await prisma.toolExecution.findMany({
      where: {
        conversationId: {
          in: conversationIds,
        },
      },
      include: {
        message: {
          select: {
            timestamp: true,
          },
        },
      },
    });

    // Define metric type
    interface ToolMetric {
      toolId: string;
      functionName: string;
      count: number;
      successCount: number;
      failureCount: number;
      avgExecutionTime?: number;
    }

    // Group executions by tool and function
    const metrics: Record<string, ToolMetric> = {};

    // Calculate metrics
    toolExecutions.forEach((execution) => {
      const key = `${execution.toolId}:${execution.functionName}`;
      if (!metrics[key]) {
        metrics[key] = {
          toolId: execution.toolId,
          functionName: execution.functionName,
          count: 0,
          successCount: 0,
          failureCount: 0,
        };
      }

      // Increment counters
      metrics[key].count++;

      if (execution.status === "COMPLETED") {
        metrics[key].successCount++;
      } else if (
        execution.status === "FAILED" ||
        execution.status === "TIMEOUT"
      ) {
        metrics[key].failureCount++;
      }

      // Calculate average execution time for successful calls
      if (execution.executionTime && execution.status === "COMPLETED") {
        const current = metrics[key].avgExecutionTime || 0;
        const currentCount = metrics[key].successCount;

        // Update running average
        metrics[key].avgExecutionTime =
          current + (execution.executionTime - current) / currentCount;
      }
    });

    return { data: Object.values(metrics) };
  } catch (error) {
    console.error("Error fetching bot tool metrics:", error);
    throw error;
  }
}

export async function getBotDetailsQuery(prisma: PrismaClient, botId: string) {
  const bot = await prisma.bot.findUnique({
    where: { id: botId },
    include: {
      botTools: {
        where: { isEnabled: true },
        include: { tool: true },
      },
      knowledgeBases: true,
    },
  });

  return {
    data: bot,
  };
}
