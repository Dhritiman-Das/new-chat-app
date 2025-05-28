import { requireAuth } from "@/utils/auth";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { getBotById } from "@/lib/queries/cached-queries";
import * as React from "react";
import { TimeFrameSelect } from "@/components/charts/time-frame-select";
import { Shell } from "@/components/shell";
import { ConversationOverviewSection } from "@/components/charts/conversation-overview-section";
import { BusinessOutcomesSection } from "@/components/charts/business-outcomes-section";
import { UserEngagementSection } from "@/components/charts/user-engagement-section";
import { Skeleton } from "@/components/ui/skeleton";
import { prisma } from "@/lib/db/prisma";
import { PlanType, SubscriptionStatus } from "@/lib/generated/prisma";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Icons } from "@/components/icons";

interface PageProps {
  params: Promise<{ orgId: string; botId: string }>;
  searchParams: Promise<{ timeFrame?: string }>;
}

export default async function AnalyticsPage({
  params,
  searchParams,
}: PageProps) {
  await requireAuth();
  const { botId, orgId } = await params;
  const { timeFrame: rawTimeFrame } = await searchParams;

  // Validate time frame from query params (but not used directly since we're using dummy data)
  const timeFrame = ["7d", "30d", "90d", "all"].includes(rawTimeFrame || "")
    ? rawTimeFrame
    : "30d";

  const subscription = await prisma.subscription.findUnique({
    where: { organizationId: orgId },
    select: { status: true, planType: true },
  });

  // Check if organization has access to analytics
  const hasAccess =
    subscription?.planType === PlanType.PRO ||
    subscription?.planType === PlanType.STANDARD;

  // Check if subscription is active
  const hasActiveSubscription =
    subscription?.status === SubscriptionStatus.ACTIVE;

  // If no access, show upgrade UI
  if (!hasAccess || !hasActiveSubscription) {
    return (
      <div>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/">Home</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbLink href={`/dashboard/${orgId}`}>
                    Dashboard
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href={`/dashboard/${orgId}/bots`}>
                    Bots
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Analytics</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <Shell className="gap-6 p-6">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 rounded-full bg-muted p-6">
              <Icons.CircleOff className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold">
              Analytics Requires an Upgrade
            </h2>
            <p className="mb-6 mt-2 max-w-md text-muted-foreground">
              {!hasAccess ? (
                <>
                  Analytics is available on the Standard and Pro plans. Upgrade
                  your plan to access detailed insights.
                </>
              ) : (
                <>
                  Your subscription requires attention. Please update your
                  billing information to access analytics.
                </>
              )}
            </p>
            <Button asChild size="lg">
              <Link href={`/dashboard/${orgId}/billing`}>
                {!hasAccess ? "Upgrade Plan" : "Update Billing"}
              </Link>
            </Button>
          </div>
        </Shell>
      </div>
    );
  }

  // Log timeFrame to prevent unused variable warning
  console.log(`Rendering analytics for time frame: ${timeFrame}`);

  // Fetch bot information
  const botResponse = await getBotById(botId);
  const bot = botResponse?.data;

  // HARDCODED DUMMY DATA INSTEAD OF FETCHING
  // This simulates a very busy and successful bot

  // Conversation volume data - showing increasing trend
  const conversationVolumeData = generateDailyData(30, {
    min: 75,
    max: 150,
    trend: "increasing",
    volatility: 0.2,
  }).map((item) => ({
    date: item.date,
    count: item.value,
  }));

  // Status data - mostly completed conversations
  const conversationStatusData = [
    { status: "COMPLETED", count: 2840 },
    { status: "ABANDONED", count: 320 },
    { status: "FAILED", count: 95 },
    { status: "ACTIVE", count: 145 },
  ];

  // Lead generation - high conversion rate with improving trend
  const leadGenerationData = {
    currentRate: 68, // 68% conversion rate
    timeSeriesData: generateDailyData(30, {
      min: 0.5,
      max: 0.7,
      trend: "increasing",
      volatility: 0.1,
    }).map((item) => ({
      date: item.date,
      rate: item.value,
    })),
  };

  // Appointments - many bookings with positive trend
  const appointmentsData = generateDailyData(30, {
    min: 10,
    max: 35,
    trend: "increasing",
    volatility: 0.25,
  }).map((item) => ({
    date: item.date,
    count: item.value,
  }));

  // Messages histogram - good engagement depth
  const messagesHistogramData = [
    { bucket: "1-3", count: 580 },
    { bucket: "4-6", count: 920 },
    { bucket: "7-10", count: 1120 },
    { bucket: "11-15", count: 840 },
    { bucket: "16-20", count: 380 },
    { bucket: "21+", count: 160 },
  ];

  // Peak usage - business hours with some evening activity
  const peakUsageData = generatePeakUsageData();

  return (
    <div>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/">Home</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbLink href={`/dashboard/${orgId}`}>
                  Dashboard
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href={`/dashboard/${orgId}/bots`}>
                  Bots
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink
                  href={`/dashboard/${orgId}/bots/${botId}/overview`}
                >
                  {bot?.name || "Bot"}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Analytics</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <Shell className="gap-6 p-6">
        <div className="flex justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
            <p className="text-muted-foreground">
              Dive into your bot&apos;s performance metrics and conversation
              insights.
            </p>
          </div>
          <div className="ml-auto flex items-center gap-4 pr-4">
            <TimeFrameSelect />
          </div>
        </div>

        {/* Business Outcomes Section */}
        <React.Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
          <BusinessOutcomesSection
            leadGenerationData={leadGenerationData}
            appointmentsData={appointmentsData}
          />
        </React.Suspense>

        {/* Conversation Overview Section */}
        <React.Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
          <ConversationOverviewSection
            conversationVolumeData={conversationVolumeData}
            conversationStatusData={conversationStatusData}
          />
        </React.Suspense>

        {/* User Engagement Section */}
        <React.Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
          <UserEngagementSection
            messagesHistogramData={messagesHistogramData}
            peakUsageData={peakUsageData}
          />
        </React.Suspense>
      </Shell>
    </div>
  );
}

// Helper function to generate daily data over time
function generateDailyData(
  days: number,
  options: {
    min: number;
    max: number;
    trend: "increasing" | "decreasing" | "steady";
    volatility: number;
  }
) {
  const { min, max, trend, volatility } = options;
  const result = [];
  const now = new Date();

  const baseValue = trend === "decreasing" ? max : min;
  const trendFactor =
    trend === "steady"
      ? 0
      : ((trend === "increasing" ? 1 : -1) * (max - min)) / days;

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    // Calculate value with trend and random volatility
    let value = baseValue + trendFactor * (days - i);

    // Add controlled randomness
    const randomness = (Math.random() - 0.5) * 2 * volatility * (max - min);
    value = Math.max(min, Math.min(max, value + randomness));

    // Round value to integer if likely to be integer
    if (value > 10) {
      value = Math.round(value);
    }

    result.push({
      date: date.toISOString().split("T")[0],
      value,
    });
  }

  return result;
}

// Helper to generate peak usage data
function generatePeakUsageData() {
  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  const data = [];

  // Generate data for each day and hour
  for (const day of days) {
    for (let hour = 0; hour < 24; hour++) {
      // Business hours pattern (9am-5pm) with highest activity
      let value = 0;

      if (hour >= 9 && hour <= 17) {
        // Business hours
        if (day !== "Saturday" && day !== "Sunday") {
          // Higher values for weekdays during business hours
          // Bell curve with peak around noon-2pm
          const distance = Math.min(Math.abs(hour - 13), 4);
          value = Math.round(50 + Math.random() * 30 - distance * 10);
        } else {
          // Lower weekend business hours
          value = Math.round(10 + Math.random() * 15);
        }
      } else if (hour >= 18 && hour <= 22) {
        // Evening hours - medium activity
        value = Math.round(15 + Math.random() * 20);
      } else {
        // Night hours - low activity
        value = Math.round(Math.random() * 8);
      }

      // Add some randomness
      value = Math.max(0, value + Math.floor((Math.random() - 0.3) * 10));

      data.push({
        day,
        hour,
        value,
      });
    }
  }

  return data;
}
