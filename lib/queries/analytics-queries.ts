import { unstable_cache as cache } from "next/cache";
import { requireAuth } from "@/utils/auth";
import { prisma } from "@/lib/db/prisma";
import * as CACHE_TAGS from "@/lib/constants/cache-tags";
import type {
  ConversationVolumeData,
  ConversationStatusData,
  LeadGenerationData,
  AppointmentsData,
  HistogramData,
  PeakUsageData,
} from "./index";

// Helper function to get date range based on timeFrame
function getDateRange(timeFrame: string) {
  const now = new Date();
  const startDate = new Date(now);

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
      startDate.setFullYear(2020); // Far back date
      break;
    default:
      startDate.setDate(now.getDate() - 30); // Default to 30 days
  }

  return { startDate, endDate: now };
}

// Helper function to generate date series for time range
function generateDateSeries(startDate: Date, endDate: Date): string[] {
  const dates: string[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    dates.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Get conversation volume data over time
 */
export async function getConversationVolumeQuery(
  botId: string,
  timeFrame: string = "30d"
) {
  await requireAuth();

  return cache(
    async (): Promise<{ data: ConversationVolumeData[] }> => {
      const { startDate, endDate } = getDateRange(timeFrame);

      // Get conversation counts grouped by date
      const conversationsData = await prisma.conversation.groupBy({
        by: ["startedAt"],
        where: {
          botId,
          startedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        _count: {
          id: true,
        },
        orderBy: {
          startedAt: "asc",
        },
      });

      // Generate complete date series and fill in data
      const dateSeries = generateDateSeries(startDate, endDate);
      const dataMap = new Map<string, number>();

      // Group conversations by date (not datetime)
      conversationsData.forEach((item) => {
        const date = item.startedAt.toISOString().split("T")[0];
        dataMap.set(date, (dataMap.get(date) || 0) + item._count.id);
      });

      const data: ConversationVolumeData[] = dateSeries.map((date) => ({
        date,
        count: dataMap.get(date) || 0,
      }));

      return { data };
    },
    [`analytics:conversation-volume:${botId}:${timeFrame}`],
    {
      tags: [
        CACHE_TAGS.BOT_CONVERSATIONS(botId),
        CACHE_TAGS.BOT_CONVERSATION_VOLUME(botId),
        CACHE_TAGS.BOT_ANALYTICS(botId),
      ],
      revalidate: 300, // 5 minutes
    }
  )();
}

/**
 * Get conversation status breakdown
 */
export async function getConversationStatusQuery(
  botId: string,
  timeFrame: string = "30d"
) {
  await requireAuth();

  return cache(
    async (): Promise<{ data: ConversationStatusData[] }> => {
      const { startDate, endDate } = getDateRange(timeFrame);

      const statusData = await prisma.conversation.groupBy({
        by: ["status"],
        where: {
          botId,
          startedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: "desc",
          },
        },
      });

      const data: ConversationStatusData[] = statusData.map((item) => ({
        status: item.status,
        count: item._count.id,
      }));

      return { data };
    },
    [`analytics:conversation-status:${botId}:${timeFrame}`],
    {
      tags: [
        CACHE_TAGS.BOT_CONVERSATION_STATUS(botId),
        CACHE_TAGS.BOT_ANALYTICS(botId),
      ],
      revalidate: 300, // 5 minutes
    }
  )();
}

/**
 * Get lead generation data with time series and current rate
 */
export async function getLeadGenerationQuery(
  botId: string,
  timeFrame: string = "30d"
) {
  await requireAuth();

  return cache(
    async (): Promise<{ data: LeadGenerationData }> => {
      const { startDate, endDate } = getDateRange(timeFrame);

      // Get total conversations and leads for current rate
      const [totalConversations, totalLeads] = await Promise.all([
        prisma.conversation.count({
          where: {
            botId,
            startedAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        }),
        prisma.lead.count({
          where: {
            botId,
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        }),
      ]);

      // Calculate current rate
      const currentRate =
        totalConversations > 0
          ? Math.round((totalLeads / totalConversations) * 100)
          : 0;

      // Get daily lead generation rates
      const dateSeries = generateDateSeries(startDate, endDate);
      const dailyData = await Promise.all(
        dateSeries.map(async (date) => {
          const dayStart = new Date(date);
          const dayEnd = new Date(date);
          dayEnd.setDate(dayEnd.getDate() + 1);

          const [dayConversations, dayLeads] = await Promise.all([
            prisma.conversation.count({
              where: {
                botId,
                startedAt: {
                  gte: dayStart,
                  lt: dayEnd,
                },
              },
            }),
            prisma.lead.count({
              where: {
                botId,
                createdAt: {
                  gte: dayStart,
                  lt: dayEnd,
                },
              },
            }),
          ]);

          const rate = dayConversations > 0 ? dayLeads / dayConversations : 0;
          return { date, rate };
        })
      );

      const data: LeadGenerationData = {
        currentRate,
        timeSeriesData: dailyData,
      };

      return { data };
    },
    [`analytics:lead-generation:${botId}:${timeFrame}`],
    {
      tags: [
        CACHE_TAGS.BOT_CONVERSATIONS(botId),
        CACHE_TAGS.BOT_LEAD_GENERATION(botId),
        CACHE_TAGS.BOT_ANALYTICS(botId),
      ],
      revalidate: 300, // 5 minutes
    }
  )();
}

/**
 * Get appointments data over time
 */
export async function getAppointmentsQuery(
  botId: string,
  timeFrame: string = "30d"
) {
  await requireAuth();

  return cache(
    async (): Promise<{ data: AppointmentsData[] }> => {
      const { startDate, endDate } = getDateRange(timeFrame);

      // Get appointments grouped by date
      const appointmentsData = await prisma.appointment.groupBy({
        by: ["createdAt"],
        where: {
          botId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        _count: {
          id: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      // Generate complete date series and fill in data
      const dateSeries = generateDateSeries(startDate, endDate);
      const dataMap = new Map<string, number>();

      // Group appointments by date (not datetime)
      appointmentsData.forEach((item) => {
        const date = item.createdAt.toISOString().split("T")[0];
        dataMap.set(date, (dataMap.get(date) || 0) + item._count.id);
      });

      const data: AppointmentsData[] = dateSeries.map((date) => ({
        date,
        count: dataMap.get(date) || 0,
      }));

      return { data };
    },
    [`analytics:appointments:${botId}:${timeFrame}`],
    {
      tags: [
        CACHE_TAGS.BOT_APPOINTMENTS(botId),
        CACHE_TAGS.BOT_ANALYTICS(botId),
      ],
      revalidate: 300, // 5 minutes
    }
  )();
}

/**
 * Get message distribution histogram (messages per conversation)
 */
export async function getMessagesHistogramQuery(
  botId: string,
  timeFrame: string = "30d"
) {
  await requireAuth();

  return cache(
    async (): Promise<{ data: HistogramData[] }> => {
      const { startDate, endDate } = getDateRange(timeFrame);

      // Get conversations with message counts
      const conversationsWithMessageCounts = await prisma.conversation.findMany(
        {
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
        }
      );

      // Define buckets
      const buckets = [
        { name: "1-3", min: 1, max: 3 },
        { name: "4-6", min: 4, max: 6 },
        { name: "7-10", min: 7, max: 10 },
        { name: "11-15", min: 11, max: 15 },
        { name: "16-20", min: 16, max: 20 },
        { name: "21+", min: 21, max: Infinity },
      ];

      // Count conversations in each bucket
      const bucketCounts = buckets.map((bucket) => {
        const count = conversationsWithMessageCounts.filter((conv) => {
          const messageCount = conv._count.messages;
          return messageCount >= bucket.min && messageCount <= bucket.max;
        }).length;

        return {
          bucket: bucket.name,
          count,
        };
      });

      return { data: bucketCounts };
    },
    [`analytics:messages-histogram:${botId}:${timeFrame}`],
    {
      tags: [
        CACHE_TAGS.BOT_CONVERSATIONS(botId),
        CACHE_TAGS.BOT_MESSAGES_HISTOGRAM(botId),
        CACHE_TAGS.BOT_ANALYTICS(botId),
      ],
      revalidate: 300, // 5 minutes
    }
  )();
}

/**
 * Get peak usage data (by hour and day of week)
 */
export async function getPeakUsageQuery(
  botId: string,
  timeFrame: string = "30d"
) {
  await requireAuth();

  return cache(
    async (): Promise<{ data: PeakUsageData[] }> => {
      const { startDate, endDate } = getDateRange(timeFrame);

      // Get all conversations in the time range
      const conversations = await prisma.conversation.findMany({
        where: {
          botId,
          startedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          startedAt: true,
        },
      });

      // Days of the week - matching JavaScript's getDay() (0 = Sunday, 1 = Monday, etc.)
      const dayNames = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];

      // Initialize data structure
      const usageMap = new Map<string, number>();

      // Initialize all day-hour combinations
      dayNames.forEach((day) => {
        for (let hour = 0; hour < 24; hour++) {
          const key = `${day}-${hour}`;
          usageMap.set(key, 0);
        }
      });

      // Count conversations by day and hour
      conversations.forEach((conv) => {
        const date = new Date(conv.startedAt);
        const dayName = dayNames[date.getDay()]; // getDay() returns 0-6 (Sun-Sat)
        const hour = date.getHours();
        const key = `${dayName}-${hour}`;

        usageMap.set(key, (usageMap.get(key) || 0) + 1);
      });

      // Convert to the expected format
      const data: PeakUsageData[] = [];
      dayNames.forEach((day) => {
        for (let hour = 0; hour < 24; hour++) {
          const key = `${day}-${hour}`;
          data.push({
            day,
            hour,
            value: usageMap.get(key) || 0,
          });
        }
      });

      return { data };
    },
    [`analytics:peak-usage:${botId}:${timeFrame}`],
    {
      tags: [
        CACHE_TAGS.BOT_CONVERSATIONS(botId),
        CACHE_TAGS.BOT_PEAK_USAGE(botId),
        `analytics:${botId}`,
      ],
      revalidate: 300, // 5 minutes
    }
  )();
}
