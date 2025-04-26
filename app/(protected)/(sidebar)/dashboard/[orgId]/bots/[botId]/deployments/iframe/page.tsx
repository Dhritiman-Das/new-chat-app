import { requireAuth } from "@/utils/auth";
import {
  getBotById,
  getIframeConfigForBot,
} from "@/lib/queries/cached-queries";

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
import { IframeConfig } from "@/components/iframe/types";
import { IframeConfigurator } from "@/components/iframe/iframe-configurator";
import { BackButton } from "@/components/back-button";
import { GuideButton } from "@/components/slack/guide-button";
import { deploymentLogos } from "@/lib/bot-deployments";

interface PageProps {
  params: Promise<{ orgId: string; botId: string }>;
}

export default async function DeploymentsIframePage({ params }: PageProps) {
  await requireAuth();
  const { botId, orgId } = await params;

  const botResponse = await getBotById(botId);
  const configResponse = await getIframeConfigForBot(botId);

  const bot = botResponse?.data;
  const iframeConfig = configResponse?.data || {};

  const LogoComponent =
    deploymentLogos["iframe" as keyof typeof deploymentLogos];

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
                <BreadcrumbPage>Deployments</BreadcrumbPage>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Iframe</BreadcrumbPage>
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
                  <h1 className="text-2xl font-bold tracking-tight">Iframe</h1>
                  <p className="text-sm text-muted-foreground">
                    Embed your bot in your website using our iframe integration.
                  </p>
                </div>
              </div>
            </div>

            <GuideButton />
          </div>

          <div>
            <IframeConfigurator
              botId={botId}
              initialConfig={iframeConfig as Partial<IframeConfig>}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
