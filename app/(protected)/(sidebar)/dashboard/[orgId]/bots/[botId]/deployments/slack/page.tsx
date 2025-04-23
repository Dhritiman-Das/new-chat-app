import { requireAuth } from "@/utils/auth";
import { getBotById } from "@/lib/queries/cached-queries";

import { SlackIntegrationCard } from "@/components/slack/slack-integration-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { getSlackIntegrations } from "./utils";

interface PageProps {
  params: Promise<{ orgId: string; botId: string }>;
}

export default async function SlackDeploymentsPage({ params }: PageProps) {
  await requireAuth();
  const { botId, orgId } = await params;

  const botResponse = await getBotById(botId);
  const slackIntegrations = await getSlackIntegrations(botId);

  const bot = botResponse?.data;
  const integration = slackIntegrations[0]; // Get the first integration if exists

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
                <BreadcrumbPage>Slack</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 pb-16">
        <div className="mx-auto w-full max-w-5xl space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Slack Integration
            </h1>
            <p className="mt-2 text-muted-foreground">
              Connect your bot to Slack to enable messaging in channels and
              direct messages.
            </p>
          </div>

          <Tabs defaultValue="setup" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="setup">Setup</TabsTrigger>
              <TabsTrigger value="guide">Guide</TabsTrigger>
            </TabsList>
            <TabsContent value="setup" className="space-y-6">
              <SlackIntegrationCard
                integration={integration}
                botId={botId}
                orgId={orgId}
              />
            </TabsContent>
            <TabsContent value="guide" className="space-y-6">
              <div className="rounded-lg border bg-card p-6">
                <h2 className="text-xl font-semibold mb-4">
                  How to use the Slack Integration
                </h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium">1. Connect to Slack</h3>
                    <p className="text-muted-foreground mt-1">
                      Use the &quot;Connect to Slack&quot; button to authorize
                      the app in your workspace.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-medium">
                      2. Invite the bot to channels
                    </h3>
                    <p className="text-muted-foreground mt-1">
                      Type{" "}
                      <code className="bg-muted px-1 py-0.5 rounded-sm">
                        /invite @YourBot
                      </code>{" "}
                      in any Slack channel to add the bot.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-medium">3. Start conversations</h3>
                    <p className="text-muted-foreground mt-1">
                      Mention the bot using{" "}
                      <code className="bg-muted px-1 py-0.5 rounded-sm">
                        @YourBot
                      </code>{" "}
                      followed by your question or command.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-medium">4. Configure settings</h3>
                    <p className="text-muted-foreground mt-1">
                      Use the Settings page to customize your bot&apos;s
                      behavior in Slack.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
