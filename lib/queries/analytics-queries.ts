import { prisma } from "@/lib/db/prisma";
import type {
  ConversationVolumeData,
  ConversationStatusData,
  ResponseTimeData,
  ToolUsageData,
  LeadGenerationData,
  AppointmentsData,
  HistogramData,
  PeakUsageData,
} from "./index";

// Define the time frames
export type TimeFrame = "7d" | "30d" | "90d" | "all";

// Helper function to get date range based on timeFrame
export function getDateRange(timeFrame: TimeFrame) {
  const now = new Date();
  const startDate = new Date();

  switch (timeFrame) {
    case "7d":
      startDate.setDate(now.getDate() - 7);
      break;
    case "30d":
      startDate.setDate(now.getDate() - 30);
      break;
    case "90d":
      startDate.setDate(now.getDate() - 90);
      break;
    case "all":
      // Return a date far in the past for "all time"
      startDate.setFullYear(2000);
      break;
  }

  return { startDate, endDate: now };
}

// Get conversation volume data
export async function getConversationVolumeData(
  botId: string,
  timeFrame: TimeFrame
): Promise<{ success: boolean; data: ConversationVolumeData[] }> {
  try {
    const { startDate, endDate } = getDateRange(timeFrame);

    // For daily data
    const conversationsByDay = await prisma.$queryRaw<ConversationVolumeData[]>`
      SELECT 
        DATE(c."startedAt")::text as date,
        COUNT(*)::int as count
      FROM "conversations" c
      WHERE c."botId" = ${botId}
        AND c."startedAt" >= ${startDate}
        AND c."startedAt" <= ${endDate}
      GROUP BY DATE(c."startedAt")
      ORDER BY date ASC
    `;

    return {
      success: true,
      data: conversationsByDay || [],
    };
  } catch (error) {
    console.error("Error fetching conversation volume data:", error);
    return {
      success: false,
      data: [],
    };
  }
}

// Get conversation status breakdown
export async function getConversationStatusData(
  botId: string,
  timeFrame: TimeFrame
): Promise<{ success: boolean; data: ConversationStatusData[] }> {
  try {
    const { startDate, endDate } = getDateRange(timeFrame);

    const statusCounts = await prisma.conversation.groupBy({
      by: ["status"],
      where: {
        botId,
        startedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: true,
    });

    const formattedData: ConversationStatusData[] = statusCounts.map(
      (item) => ({
        status: item.status,
        count: item._count,
      })
    );

    return {
      success: true,
      data: formattedData,
    };
  } catch (error) {
    console.error("Error fetching conversation status data:", error);
    return {
      success: false,
      data: [],
    };
  }
}

// Get response time data
export async function getResponseTimeData(
  botId: string,
  timeFrame: TimeFrame
): Promise<{ success: boolean; data: ResponseTimeData[] }> {
  try {
    const { startDate, endDate } = getDateRange(timeFrame);

    const responseTimeByDay = await prisma.$queryRaw<ResponseTimeData[]>`
      SELECT 
        DATE(m."timestamp")::text as date,
        AVG(m."processingTime")::float as "avgResponseTime"
      FROM "messages" m
      JOIN "conversations" c ON m."conversationId" = c.id
      WHERE c."botId" = ${botId}
        AND m."role" = 'ASSISTANT'
        AND m."processingTime" IS NOT NULL
        AND c."startedAt" >= ${startDate}
        AND c."startedAt" <= ${endDate}
      GROUP BY DATE(m."timestamp")
      ORDER BY date ASC
    `;

    return {
      success: true,
      data: responseTimeByDay || [],
    };
  } catch (error) {
    console.error("Error fetching response time data:", error);
    return {
      success: false,
      data: [],
    };
  }
}

// Get tool usage data
export async function getToolUsageData(
  botId: string,
  timeFrame: TimeFrame
): Promise<{ success: boolean; data: ToolUsageData[] }> {
  try {
    const { startDate, endDate } = getDateRange(timeFrame);

    const toolUsage = await prisma.$queryRaw<ToolUsageData[]>`
      SELECT 
        t."name"::text as tool,
        COUNT(*)::int as count
      FROM "tool_executions" te
      JOIN "conversations" c ON te."conversationId" = c.id
      JOIN "tools" t ON te."toolId" = t.id
      WHERE c."botId" = ${botId}
        AND c."startedAt" >= ${startDate}
        AND c."startedAt" <= ${endDate}
      GROUP BY t."name"
      ORDER BY count DESC
    `;

    return {
      success: true,
      data: toolUsage || [],
    };
  } catch (error) {
    console.error("Error fetching tool usage data:", error);
    return {
      success: false,
      data: [],
    };
  }
}

// Get lead generation data
export async function getLeadGenerationData(
  botId: string,
  timeFrame: TimeFrame
): Promise<{ success: boolean; data: LeadGenerationData }> {
  try {
    const { startDate, endDate } = getDateRange(timeFrame);

    // Get total conversations in time period
    const totalConversations = await prisma.conversation.count({
      where: {
        botId,
        startedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Get conversations that generated leads
    const conversationsWithLeads = await prisma.conversation.count({
      where: {
        botId,
        startedAt: {
          gte: startDate,
          lte: endDate,
        },
        leads: {
          some: {},
        },
      },
    });

    // Calculate lead rate
    const leadRate =
      totalConversations > 0 ? conversationsWithLeads / totalConversations : 0;

    // Using prisma instead of raw query to avoid field name mismatch issues
    const conversations = await prisma.conversation.findMany({
      where: {
        botId,
        startedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        leads: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        startedAt: "asc",
      },
    });

    // Process result to get daily lead rate
    const dailyMap = new Map<string, { total: number; withLeads: number }>();

    for (const conv of conversations) {
      const date = conv.startedAt.toISOString().split("T")[0];
      const hasLead = conv.leads.length > 0;

      if (!dailyMap.has(date)) {
        dailyMap.set(date, { total: 0, withLeads: 0 });
      }

      const current = dailyMap.get(date)!;
      current.total += 1;
      if (hasLead) current.withLeads += 1;
    }

    const dailyLeadRate = Array.from(dailyMap.entries()).map(
      ([date, data]) => ({
        date,
        rate: data.total > 0 ? data.withLeads / data.total : 0,
      })
    );

    return {
      success: true,
      data: {
        currentRate: Math.round(leadRate * 100), // Convert to percentage
        timeSeriesData: dailyLeadRate,
      },
    };
  } catch (error) {
    console.error("Error fetching lead generation data:", error);

    // If the query fails, return a fallback empty dataset
    return {
      success: true,
      data: {
        currentRate: 0,
        timeSeriesData: [],
      },
    };
  }
}

// Get appointments data
export async function getAppointmentsData(
  botId: string,
  timeFrame: TimeFrame
): Promise<{ success: boolean; data: AppointmentsData[] }> {
  try {
    const { startDate, endDate } = getDateRange(timeFrame);

    const appointmentsByDay = await prisma.$queryRaw<AppointmentsData[]>`
      SELECT 
        DATE(a."startTime")::text as date,
        COUNT(*)::int as count
      FROM "appointments" a
      WHERE a."botId" = ${botId}
        AND a."startTime" >= ${startDate}
        AND a."startTime" <= ${endDate}
      GROUP BY DATE(a."startTime")
      ORDER BY date ASC
    `;

    return {
      success: true,
      data: appointmentsByDay || [],
    };
  } catch (error) {
    console.error("Error fetching appointments data:", error);
    return {
      success: false,
      data: [],
    };
  }
}

// Get messages per conversation histogram
export async function getMessagesHistogramData(
  botId: string,
  timeFrame: TimeFrame
): Promise<{ success: boolean; data: HistogramData[] }> {
  try {
    const { startDate, endDate } = getDateRange(timeFrame);

    // Raw data: message count per conversation
    const conversationMessageCounts = await prisma.conversation.findMany({
      where: {
        botId,
        startedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });

    // Create buckets for the histogram
    const buckets = [
      { min: 1, max: 3, label: "1-3" },
      { min: 4, max: 6, label: "4-6" },
      { min: 7, max: 10, label: "7-10" },
      { min: 11, max: 15, label: "11-15" },
      { min: 16, max: 20, label: "16-20" },
      { min: 21, max: Number.MAX_SAFE_INTEGER, label: "21+" },
    ];

    // Count conversations in each bucket
    const histogramData: HistogramData[] = buckets.map((bucket) => {
      const count = conversationMessageCounts.filter(
        (c) =>
          c._count.messages >= bucket.min && c._count.messages <= bucket.max
      ).length;

      return {
        bucket: bucket.label,
        count,
      };
    });

    return {
      success: true,
      data: histogramData,
    };
  } catch (error) {
    console.error("Error fetching messages histogram data:", error);
    return {
      success: false,
      data: [],
    };
  }
}

// Get peak usage times
export async function getPeakUsageData(
  botId: string,
  timeFrame: TimeFrame
): Promise<{ success: boolean; data: PeakUsageData[] }> {
  try {
    const { startDate, endDate } = getDateRange(timeFrame);

    const peakUsage = await prisma.$queryRaw`
      SELECT 
        EXTRACT(DOW FROM c."startedAt")::int as day_of_week,
        EXTRACT(HOUR FROM c."startedAt")::int as hour,
        COUNT(*)::int as value
      FROM "conversations" c
      WHERE c."botId" = ${botId}
        AND c."startedAt" >= ${startDate}
        AND c."startedAt" <= ${endDate}
      GROUP BY day_of_week, hour
      ORDER BY day_of_week, hour
    `;

    // Transform database day numbers (0-6, Sunday is 0) to day names
    const dayMapping = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    const formattedData: PeakUsageData[] = (
      peakUsage as { day_of_week: number; hour: number; value: number }[]
    ).map((item) => ({
      day: dayMapping[item.day_of_week],
      hour: Math.floor(item.hour), // Ensure hour is an integer
      value: Number(item.value),
    }));

    return {
      success: true,
      data: formattedData,
    };
  } catch (error) {
    console.error("Error fetching peak usage data:", error);
    return {
      success: false,
      data: [],
    };
  }
}
