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
import { getBotById, getOrganizationById } from "@/lib/queries/cached-queries";
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
import {
  getConversationVolumeQuery,
  getConversationStatusQuery,
  getLeadGenerationQuery,
  getAppointmentsQuery,
  getMessagesHistogramQuery,
  getPeakUsageQuery,
} from "@/lib/queries/analytics-queries";

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

  // Validate time frame from query params
  const timeFrame = ["7d", "30d", "90d", "all"].includes(rawTimeFrame || "")
    ? rawTimeFrame
    : "30d";

  // Fetch bot data and organization in parallel
  const [botResponse, organizationResponse] = await Promise.all([
    getBotById(botId),
    getOrganizationById(orgId),
  ]);

  const bot = botResponse?.data;
  const organization = organizationResponse?.data;

  // Check subscription status
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

  // Fetch real analytics data from database
  const [
    conversationVolumeResponse,
    conversationStatusResponse,
    leadGenerationResponse,
    appointmentsResponse,
    messagesHistogramResponse,
    peakUsageResponse,
  ] = await Promise.all([
    getConversationVolumeQuery(botId, timeFrame),
    getConversationStatusQuery(botId, timeFrame),
    getLeadGenerationQuery(botId, timeFrame),
    getAppointmentsQuery(botId, timeFrame),
    getMessagesHistogramQuery(botId, timeFrame),
    getPeakUsageQuery(botId, timeFrame),
  ]);

  const conversationVolumeData = conversationVolumeResponse.data;
  const conversationStatusData = conversationStatusResponse.data;
  const leadGenerationData = leadGenerationResponse.data;
  const appointmentsData = appointmentsResponse.data;
  const messagesHistogramData = messagesHistogramResponse.data;
  const peakUsageData = peakUsageResponse.data;

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
                <BreadcrumbLink href={`/dashboard/${orgId}`}>
                  {organization?.slug || orgId}
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
