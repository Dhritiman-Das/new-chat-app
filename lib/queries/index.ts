import { PrismaClient } from "@/lib/generated/prisma";
import { Prisma as PrismaTypes } from "@/lib/generated/prisma";

// Analytics data types
export interface ConversationVolumeData {
  date: string;
  count: number;
}

export interface ConversationStatusData {
  status: string;
  count: number;
}

export interface ResponseTimeData {
  date: string;
  avgResponseTime: number;
}

export interface ToolUsageData {
  tool: string;
  count: number;
}

export interface LeadGenerationData {
  currentRate: number;
  timeSeriesData: { date: string; rate: number }[];
}

export interface AppointmentsData {
  date: string;
  count: number;
}

export interface HistogramData {
  bucket: string;
  count: number;
}

export interface PeakUsageData {
  day: string;
  hour: number;
  value: number;
}

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
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

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
      _count: {
        select: {
          knowledgeBases: true,
          botTools: {
            where: {
              isEnabled: true,
            },
          },
          deployments: {
            where: {
              status: "ACTIVE",
            },
          },
          conversations: {
            where: {
              startedAt: {
                gte: sevenDaysAgo,
              },
            },
          },
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
        // Include leads and appointments
        leads: true,
        appointments: true,
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

/**
 * Get conversation status counts for a bot
 */
export async function getConversationStatusCountsQuery(
  prisma: PrismaClient,
  botId: string
) {
  const statusCounts = await prisma.conversation.groupBy({
    by: ["status"],
    where: {
      botId,
    },
    _count: {
      status: true,
    },
  });

  // Convert to record with default values for all statuses
  const counts = {
    ACTIVE: 0,
    COMPLETED: 0,
    FAILED: 0,
    ABANDONED: 0,
  };

  statusCounts.forEach((item) => {
    counts[item.status] = item._count.status;
  });

  return counts;
}

/**
 * Get conversations with filtering and pagination
 */
export async function getConversationsQuery(
  prisma: PrismaClient,
  botId: string,
  page = 1,
  per_page = 10,
  sort?: string,
  filters?: string | object,
  search?: string
) {
  // Parse sort parameter
  let orderBy: PrismaTypes.ConversationOrderByWithRelationInput = {
    startedAt: "desc",
  };

  if (sort) {
    const [field, direction] = sort.split(":");
    const isValidDirection = direction === "asc" || direction === "desc";

    if (field && isValidDirection) {
      orderBy = {
        [field]: direction,
      };
    }
  }

  // Calculate pagination
  const skip = (page - 1) * per_page;

  // Parse filters
  const where: PrismaTypes.ConversationWhereInput = { botId };

  // Add search functionality
  if (search && search.trim()) {
    const searchTerm = search.trim();

    // Search in conversation ID or messages
    where.OR = [
      {
        id: {
          contains: searchTerm,
          mode: "insensitive",
        },
      },
      {
        messages: {
          some: {
            content: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
        },
      },
    ];
  }

  if (filters) {
    try {
      // Handle the case where filters is already an object
      const parsedFilters =
        typeof filters === "string" ? JSON.parse(filters) : filters;

      if (parsedFilters.status?.length) {
        where.status = { in: parsedFilters.status };
      }

      if (parsedFilters.source?.length) {
        where.source = { in: parsedFilters.source };
      }

      // Fix date filter to use startedAt instead of date
      if (parsedFilters.startedAt?.from || parsedFilters.startedAt?.to) {
        where.startedAt = {};

        if (parsedFilters.startedAt.from) {
          where.startedAt.gte = new Date(parsedFilters.startedAt.from);
        }

        if (parsedFilters.startedAt.to) {
          where.startedAt.lte = new Date(parsedFilters.startedAt.to);
        }
      }
    } catch (error) {
      console.error("Error parsing filters:", error);
    }
  }

  // Get conversations with pagination
  const [conversations, totalCount] = await Promise.all([
    prisma.conversation.findMany({
      where,
      include: {
        messages: {
          take: 1,
          orderBy: {
            timestamp: "desc",
          },
        },
        _count: {
          select: {
            messages: true,
            toolExecutions: true,
          },
        },
      },
      orderBy,
      skip,
      take: per_page,
    }),
    prisma.conversation.count({ where }),
  ]);

  return {
    data: conversations,
    pageCount: Math.ceil(totalCount / per_page),
  };
}

/**
 * Get sources available for a specific bot
 */
export async function getConversationSourcesQuery(
  prisma: PrismaClient,
  botId: string
) {
  const sources = await prisma.conversation.groupBy({
    by: ["source"],
    where: {
      botId,
      source: {
        not: null,
      },
    },
  });

  return sources.map((s) => s.source).filter(Boolean) as string[];
}

export async function getInstalledDeploymentsQuery(
  prisma: PrismaClient,
  botId: string
) {
  const installedDeployments = await prisma.deployment.findMany({
    where: {
      botId,
    },
  });

  return installedDeployments;
}

export async function getBotAppointmentsQuery(
  prisma: PrismaClient,
  botId: string,
  page = 1,
  limit = 10
) {
  // Calculate skip for pagination
  const skip = (page - 1) * limit;

  // Get appointments with pagination
  const [appointments, total] = await Promise.all([
    prisma.appointment.findMany({
      where: { botId },
      orderBy: { startTime: "desc" },
      skip,
      take: limit,
    }),
    prisma.appointment.count({
      where: { botId },
    }),
  ]);

  // Calculate total pages
  const totalPages = Math.ceil(total / limit);

  return {
    data: {
      appointments,
      totalPages,
      currentPage: page,
      total,
    },
  };
}

/**
 * Get user's bots grouped by organizations
 */
export async function getUserBotsGroupedByOrgQuery(
  prisma: PrismaClient,
  userId: string
) {
  // First get all organizations the user belongs to
  const userOrgs = await prisma.userOrganization.findMany({
    where: {
      userId: userId,
    },
    include: {
      organization: true,
    },
    orderBy: {
      organization: {
        name: "asc",
      },
    },
  });

  // Initialize result with organizations
  const result = await Promise.all(
    userOrgs.map(async (userOrg) => {
      // Fetch bots for each organization
      const bots = await prisma.bot.findMany({
        where: {
          organizationId: userOrg.organization.id,
        },
        orderBy: {
          name: "asc",
        },
      });

      return {
        organization: {
          id: userOrg.organization.id,
          name: userOrg.organization.name,
          slug: userOrg.organization.slug,
          logoUrl: userOrg.organization.logoUrl,
        },
        role: userOrg.role,
        bots: bots,
      };
    })
  );

  return {
    data: result,
  };
}

// New function to get bot counts
export async function getBotCountsQuery(prisma: PrismaClient, botId: string) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const counts = await prisma.bot.findUnique({
    where: { id: botId },
    select: {
      _count: {
        select: {
          knowledgeBases: true,
          botTools: {
            where: {
              isEnabled: true,
            },
          },
          deployments: {
            where: {
              status: "ACTIVE",
            },
          },
          conversations: {
            where: {
              startedAt: {
                gte: sevenDaysAgo,
              },
            },
          },
        },
      },
    },
  });

  return counts?._count;
}

/**
 * Get all bot tools for a specific bot, including disabled ones
 */
export async function getBotAllToolsQuery(prisma: PrismaClient, botId: string) {
  const botTools = await prisma.botTool.findMany({
    where: { botId },
    select: {
      toolId: true,
      isEnabled: true,
    },
  });

  return {
    data: botTools,
  };
}

// For subscription events, cache for 5 minutes
// For payment events, cache for 5 minutes

/**
 * Get organization invoices with optional pagination
 */
export async function getOrganizationInvoicesQuery(
  prisma: PrismaClient,
  organizationId: string,
  page = 1,
  pageSize = 10
) {
  try {
    const skip = (page - 1) * pageSize;

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where: {
          organizationId,
        },
        orderBy: {
          createdAt: "desc",
        },
        include: {
          subscription: {
            select: {
              planType: true,
              billingCycle: true,
            },
          },
        },
        skip,
        take: pageSize,
      }),
      prisma.invoice.count({
        where: {
          organizationId,
        },
      }),
    ]);

    return {
      data: invoices,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  } catch (error) {
    console.error("Error fetching organization invoices:", error);
    throw error;
  }
}
