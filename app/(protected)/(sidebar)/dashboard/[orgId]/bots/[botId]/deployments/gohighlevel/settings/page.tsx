import { requireAuth } from "@/utils/auth";
import { getBotById } from "@/lib/queries/cached-queries";

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

import { BackButton } from "@/components/back-button";
import { deploymentLogos } from "@/lib/bot-deployments";
import { getGoHighLevelIntegrations } from "../utils";
import { GoHighLevelChannelList } from "@/components/gohighlevel/gohighlevel-channel-list";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface PageProps {
  params: Promise<{ orgId: string; botId: string }>;
}

export default async function GoHighLevelSettingsPage({ params }: PageProps) {
  await requireAuth();
  const { botId, orgId } = await params;

  const LogoComponent =
    deploymentLogos["gohighlevel" as keyof typeof deploymentLogos];

  const botResponse = await getBotById(botId);
  const goHighLevelIntegrations = await getGoHighLevelIntegrations(botId);

  const bot = botResponse?.data;
  const integration = goHighLevelIntegrations[0]; // Get the first integration if exists

  // If no integration exists, redirect to the main deployment page
  if (!integration) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold">
            GoHighLevel integration not found
          </h2>
          <p className="text-muted-foreground mt-2">
            Please set up your GoHighLevel integration first.
          </p>
          <a
            href={`/dashboard/${orgId}/bots/${botId}/deployments/gohighlevel`}
            className="inline-block mt-4 text-primary hover:underline"
          >
            Go to GoHighLevel integration page
          </a>
        </div>
      </div>
    );
  }

  // Get channel information from deployment config
  const channels = integration?.deployment?.config.channels || [];

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
                  href={`/dashboard/${orgId}/bots/${botId}/deployments/gohighlevel`}
                >
                  GoHighLevel
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
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <BackButton />

              <div className="flex items-center gap-3">
                {LogoComponent ? (
                  <LogoComponent />
                ) : (
                  <div className="h-6 w-6 bg-muted rounded-md" />
                )}
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">
                    GoHighLevel Settings
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Configure your GoHighLevel integration settings.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Channel Settings</CardTitle>
                <CardDescription>
                  Select which GoHighLevel channels your bot should respond to.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <GoHighLevelChannelList
                  channels={channels}
                  integrationId={integration.id}
                  deploymentId={integration.deployment?.id}
                />
              </CardContent>
            </Card>

            {/* Additional settings can be added here in the future */}
          </div>
        </div>
      </div>
    </div>
  );
}
