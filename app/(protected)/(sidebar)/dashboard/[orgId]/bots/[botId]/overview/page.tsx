import { requireAuth } from "@/utils/auth";
import {
  getUserBots,
  getUserActiveBotCount,
  getUserKnowledgeBaseCount,
  getRecentConversations,
} from "@/lib/queries/cached-queries";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Icons } from "@/components/icons";
import { formatDistanceToNow } from "date-fns";
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

export default async function Dashboard() {
  const user = await requireAuth();

  // Fetch data in parallel
  const [
    botsResponse,
    activeBotCountResponse,
    knowledgeBaseCountResponse,
    recentConversationsResponse,
  ] = await Promise.all([
    getUserBots(),
    getUserActiveBotCount(),
    getUserKnowledgeBaseCount(),
    getRecentConversations(5),
  ]);

  const bots = botsResponse?.data || [];
  const activeBotCount = activeBotCountResponse?.data || 0;
  const knowledgeBaseCount = knowledgeBaseCountResponse?.data || 0;
  const recentConversations = recentConversationsResponse?.data || [];

  const stats = [
    {
      name: "Total Bots",
      value: String(bots.length),
      change: `${activeBotCount} active`,
      icon: <Icons.Bot className="h-4 w-4 text-muted-foreground" />,
    },
    {
      name: "Knowledge Bases",
      value: String(knowledgeBaseCount),
      change: "Across all bots",
      icon: <Icons.Database className="h-4 w-4 text-muted-foreground" />,
    },
    {
      name: "Recent Conversations",
      value: String(recentConversations.length),
      change: "In the last 7 days",
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
                <BreadcrumbPage>Dashboard</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

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

        {recentConversations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Conversations</CardTitle>
              <CardDescription>
                Your bots&apos; most recent interactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className="flex items-start space-x-4"
                  >
                    <Icons.Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="font-medium">
                        Conversation {conversation.id.substring(0, 8)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {conversation.messages[0]?.content.substring(0, 50)}
                        {conversation.messages[0]?.content.length > 50
                          ? "..."
                          : ""}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(conversation.startedAt), {
                          addSuffix: true,
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="bg-card p-4 rounded-lg shadow-sm mt-8">
          <h2 className="text-lg font-semibold mb-2">Welcome back!</h2>
          <p className="text-muted-foreground">
            You are logged in as: {user.email}
          </p>
        </div>
      </div>
    </div>
  );
}
