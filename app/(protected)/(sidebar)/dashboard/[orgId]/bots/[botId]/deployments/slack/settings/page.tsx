import { requireAuth } from "@/utils/auth";
import { getBotById } from "@/lib/queries/cached-queries";
import { getSlackIntegrations } from "@/app/(protected)/(sidebar)/dashboard/[orgId]/bots/[botId]/deployments/slack/utils";
import { SlackSettings } from "@/components/slack/slack-settings";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/back-button";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface PageProps {
  params: Promise<{ orgId: string; botId: string }>;
}

export default async function SlackSettingsPage({ params }: PageProps) {
  await requireAuth();
  const { botId, orgId } = await params;

  const botResponse = await getBotById(botId);
  const slackIntegrations = await getSlackIntegrations(botId);

  const bot = botResponse?.data;
  const integration = slackIntegrations[0]; // Get the first integration if exists

  if (!integration) {
    notFound();
  }

  return (
    <div className="flex flex-col h-full">
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
                <BreadcrumbLink
                  href={`/dashboard/${orgId}/bots/${botId}/deployments`}
                >
                  Deployments
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink
                  href={`/dashboard/${orgId}/bots/${botId}/deployments/slack`}
                >
                  Slack
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Settings</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 pb-16">
        <div className="mx-auto w-full space-y-8">
          <div className="flex items-center gap-4">
            <BackButton />

            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Slack Settings
              </h1>
              <p className="mt-2 text-muted-foreground">
                Configure how your bot interacts with Slack.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <SlackSettings integration={integration} />
          </div>
        </div>
      </div>
    </div>
  );
}
