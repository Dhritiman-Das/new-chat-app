import { requireAuth } from "@/utils/auth";
import {
  getBotById,
  getBotDetails,
  getBotConversations,
  getOrganizationById,
} from "@/lib/queries/cached-queries";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { cn } from "@/lib/utils";
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
import { ConversationItem } from "./_components/conversation-item";
import Link from "next/link";

interface PageProps {
  params: Promise<{ orgId: string; botId: string }>;
}

export default async function Dashboard({ params }: PageProps) {
  await requireAuth();
  const { botId, orgId } = await params;

  // Fetch data in parallel
  const [
    botResponse,
    botDetailsResponse,
    recentConversationsResponse,
    organizationResponse,
  ] = await Promise.all([
    getBotById(botId),
    getBotDetails(botId),
    getBotConversations(botId, 1, 5),
    getOrganizationById(orgId),
  ]);

  const bot = botResponse?.data;
  const botDetails = botDetailsResponse?.data;
  const knowledgeBaseCount = botDetails?.knowledgeBases?.length || 0;
  const recentConversations = recentConversationsResponse?.data || [];
  const organization = organizationResponse?.data;

  const stats = [
    {
      name: "Bot Status",
      value: bot?.isActive ? "Active" : "Inactive",
      change: `Created ${new Date(
        bot?.createdAt || Date.now()
      ).toLocaleDateString()}`,
      icon: <Icons.Bot className="h-4 w-4 text-muted-foreground" />,
    },
    {
      name: "Knowledge Bases",
      value: String(knowledgeBaseCount),
      change: "Connected to this bot",
      icon: <Icons.Database className="h-4 w-4 text-muted-foreground" />,
    },
    {
      name: "Recent Conversations",
      value: String(recentConversations.length),
      change: "With this bot",
      icon: <Icons.MessageSquare className="h-4 w-4 text-muted-foreground" />,
    },
  ];

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
                <BreadcrumbPage>Overview</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Overview</h1>

        <div className="mx-auto grid grid-cols-1 gap-px rounded-xl bg-border sm:grid-cols-3 mb-8">
          {stats.map((stat, index) => (
            <Card
              key={stat.name}
              className={cn(
                "rounded-none border-0 shadow-none",
                index === 0 && "rounded-l-xl",
                index === stats.length - 1 && "rounded-r-xl"
              )}
            >
              <CardContent className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 p-4 sm:p-6">
                <div className="flex justify-between w-full">
                  <div className="text-sm font-medium text-muted-foreground">
                    {stat.name}
                  </div>
                  {stat.icon}
                </div>
                <div className="w-full flex-none text-3xl font-medium tracking-tight text-foreground">
                  {stat.value}
                </div>
                <div className="text-xs text-muted-foreground">
                  {stat.change}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {recentConversations.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Recent Conversations</CardTitle>
              <CardDescription>
                This bot&apos;s most recent interactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {recentConversations.map((conversation) => (
                  <ConversationItem
                    key={conversation.id}
                    conversation={conversation}
                    orgId={orgId}
                    botId={botId}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>No Conversations Yet</CardTitle>
              <CardDescription>
                This bot hasn&apos;t had any conversations yet. Start chatting
                to see interactions here.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center py-8">
              <Icons.MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center mb-6 max-w-sm">
                Get started by testing your bot in the playground. You can have
                conversations and see how it responds.
              </p>
              <Button asChild>
                <Link href={`/dashboard/${orgId}/bots/${botId}/playground`}>
                  <Icons.Terminal className="h-4 w-4 mr-2" />
                  Try in Playground
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
