import { requireAuth } from "@/utils/auth";
import {
  getBotById,
  getBotCounts,
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
import { SetupProgressTracker } from "./_components/setup-progress-tracker";
import Link from "next/link";

interface PageProps {
  params: Promise<{ orgId: string; botId: string }>;
}

// Clickable stat card component
function StatCard({
  name,
  value,
  change,
  icon,
  href,
  className,
}: {
  name: string;
  value: string;
  change: string;
  icon: React.ReactNode;
  href: string;
  className?: string;
}) {
  return (
    <Link href={href} className="block group">
      <Card
        className={cn(
          "rounded-none border-0 shadow-none transition-colors hover:bg-muted/50",
          className
        )}
      >
        <CardContent className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 p-4 sm:p-6">
          <div className="flex justify-between w-full">
            <div className="text-sm font-medium text-muted-foreground">
              {name}
            </div>
            <div className="flex items-center gap-2">
              {icon}
              <Icons.ArrowUpRight className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
          </div>
          <div className="w-full flex-none text-3xl font-medium tracking-tight text-foreground group-hover:text-primary transition-colors">
            {value}
          </div>
          <div className="text-xs text-muted-foreground">{change}</div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default async function Dashboard({ params }: PageProps) {
  await requireAuth();
  const { botId, orgId } = await params;

  // Fetch data in parallel
  const [
    botResponse,
    botCountsResponse,
    recentConversationsResponse,
    organizationResponse,
  ] = await Promise.all([
    getBotById(botId),
    getBotCounts(botId),
    getBotConversations(botId, 1, 5),
    getOrganizationById(orgId),
  ]);

  const bot = botResponse?.data;
  const counts = botCountsResponse || {
    knowledgeBases: 0,
    botTools: 0,
    deployments: 0,
    conversations: 0,
  };
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
      href: `/dashboard/${orgId}/bots/${botId}/settings`,
    },
    {
      name: "Knowledge Bases",
      value: String(counts.knowledgeBases),
      change: "Connected to this bot",
      icon: <Icons.Database className="h-4 w-4 text-muted-foreground" />,
      href: `/dashboard/${orgId}/bots/${botId}/knowledge`,
    },
    {
      name: "Active Tools",
      value: String(counts.botTools),
      change: "Enabled and ready to use",
      icon: <Icons.Hammer className="h-4 w-4 text-muted-foreground" />,
      href: `/dashboard/${orgId}/bots/${botId}/tools`,
    },
    {
      name: "Deployments",
      value: String(counts.deployments),
      change: "Active deployments",
      icon: <Icons.Globe className="h-4 w-4 text-muted-foreground" />,
      href: `/dashboard/${orgId}/bots/${botId}/deployments`,
    },
    {
      name: "Recent Conversations",
      value: String(counts.conversations),
      change: "In the last 7 days",
      icon: <Icons.MessageSquare className="h-4 w-4 text-muted-foreground" />,
      href: `/dashboard/${orgId}/bots/${botId}/conversations`,
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

        {/* Setup Progress Tracker */}
        <div className="mb-8">
          <SetupProgressTracker orgId={orgId} botId={botId} counts={counts} />
        </div>

        {/* Stats Cards */}
        <div className="mx-auto grid grid-cols-1 gap-px rounded-xl bg-border sm:grid-cols-2 lg:grid-cols-5 mb-8">
          {stats.map((stat, index) => (
            <StatCard
              key={stat.name}
              name={stat.name}
              value={stat.value}
              change={stat.change}
              icon={stat.icon}
              href={stat.href}
              className={cn(
                // Mobile: first and last cards get rounded corners
                index === 0 && "rounded-t-xl",
                index === stats.length - 1 && "rounded-b-xl",
                // Tablet (sm): first and last in each row get rounded corners
                "sm:rounded-none",
                index === 0 && "sm:rounded-tl-xl",
                index === 1 && "sm:rounded-tr-xl",
                index === stats.length - 2 && "sm:rounded-bl-xl",
                index === stats.length - 1 && "sm:rounded-br-xl",
                // Desktop (lg): single row, first and last get rounded corners
                "lg:rounded-none",
                index === 0 && "lg:rounded-l-xl",
                index === stats.length - 1 && "lg:rounded-r-xl"
              )}
            />
          ))}
        </div>

        {/* Recent Conversations Section */}
        {recentConversations.length > 0 ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Conversations</CardTitle>
                  <CardDescription>
                    This bot&apos;s most recent interactions
                  </CardDescription>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link
                    href={`/dashboard/${orgId}/bots/${botId}/conversations`}
                  >
                    View all
                    <Icons.ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>
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
              <div className="flex gap-2">
                <Button asChild>
                  <Link href={`/dashboard/${orgId}/bots/${botId}/playground`}>
                    <Icons.Terminal className="h-4 w-4 mr-2" />
                    Try in Playground
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link
                    href={`/dashboard/${orgId}/bots/${botId}/conversations`}
                  >
                    View conversations
                    <Icons.ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
