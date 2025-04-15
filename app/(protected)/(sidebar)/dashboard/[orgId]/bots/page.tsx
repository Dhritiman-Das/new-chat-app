import Link from "next/link";
import {
  getUserBots,
  getUserOrganizations,
} from "@/lib/queries/cached-queries";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  PlusCircle,
  MessageCircle,
  ChevronRight,
  Database,
  Building,
} from "@/components/icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Bot, Organization } from "@/lib/generated/prisma";

// Extended type for the bot with organization information
interface BotWithOrg extends Bot {
  organization: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
  };
}

// Organization with user role
interface OrganizationWithRole extends Organization {
  role: string;
}

interface PageProps {
  params: Promise<{ orgId: string }>;
}

export default async function BotsPage({ params }: PageProps) {
  const { orgId } = await params;

  const { data: bots } = await getUserBots();
  const { data: organizations } = await getUserOrganizations();

  // Cast to typed arrays
  const typedBots = bots as BotWithOrg[];
  const typedOrgs = organizations as OrganizationWithRole[];

  // Group bots by organization
  const botsByOrg = typedBots.reduce((acc, bot) => {
    const orgId = bot.organization.id;
    if (!acc[orgId]) {
      acc[orgId] = [];
    }
    acc[orgId].push(bot);
    return acc;
  }, {} as Record<string, BotWithOrg[]>);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Your Bots</h1>
        <Button asChild>
          <Link href={`/dashboard/${orgId}/bots/new`}>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Bot
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Bots</TabsTrigger>
          {typedOrgs.map((org) => (
            <TabsTrigger key={org.id} value={org.id}>
              {org.name}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          {typedBots.length === 0 ? (
            <EmptyState params={params} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {typedBots.map((bot) => (
                <BotCard key={bot.id} bot={bot} />
              ))}
            </div>
          )}
        </TabsContent>

        {typedOrgs.map((org) => (
          <TabsContent key={org.id} value={org.id} className="space-y-6">
            <div className="flex items-center mb-6 space-x-4">
              <OrganizationAvatar organization={org} />
              <div>
                <h2 className="text-xl font-semibold">{org.name}</h2>
                <Badge variant="outline" className="mt-1">
                  {org.plan.charAt(0) + org.plan.slice(1).toLowerCase()} Plan
                </Badge>
              </div>
            </div>

            {!botsByOrg[org.id] || botsByOrg[org.id].length === 0 ? (
              <EmptyOrgState organization={org} params={params} />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {botsByOrg[org.id]?.map((bot) => (
                  <BotCard key={bot.id} bot={bot} />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function BotCard({ bot }: { bot: BotWithOrg }) {
  return (
    <Link href={`/bots/${bot.id}`} className="group">
      <Card className="h-full transition-all border-border/40 hover:border-border/80 hover:shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  bot.isActive ? "bg-green-500" : "bg-gray-400"
                }`}
              />
              <CardTitle className="text-lg">{bot.name}</CardTitle>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </div>
          <CardDescription className="line-clamp-2 h-10">
            {bot.description || "No description provided"}
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-2 text-sm text-muted-foreground space-y-2">
          <div className="flex items-center gap-1">
            <Database className="h-3.5 w-3.5" />
            <span>Knowledge Bases: 0</span>
          </div>
          <div className="flex items-center gap-1">
            <Building className="h-3.5 w-3.5" />
            <span>Organization: {bot.organization.name}</span>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <MessageCircle className="h-3.5 w-3.5" />
            <span>No recent conversations</span>
          </div>
          <div>Created {new Date(bot.createdAt).toLocaleDateString()}</div>
        </CardFooter>
      </Card>
    </Link>
  );
}

function OrganizationAvatar({
  organization,
}: {
  organization: OrganizationWithRole;
}) {
  const initials = organization.name
    .split(" ")
    .map((part: string) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Avatar className="h-12 w-12">
      {organization.logoUrl ? (
        <AvatarImage src={organization.logoUrl} alt={organization.name} />
      ) : null}
      <AvatarFallback className="text-lg bg-primary/10 text-primary">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

async function EmptyState({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;

  return (
    <Card className="border-dashed border-2 p-8">
      <div className="flex flex-col items-center justify-center text-center space-y-6">
        <div className="rounded-full bg-primary/10 p-6">
          <MessageCircle className="h-10 w-10 text-primary" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">No bots yet</h3>
          <p className="text-muted-foreground">
            Create your first bot to start building conversational experiences.
          </p>
        </div>
        <Button asChild>
          <Link href={`/dashboard/${orgId}/bots/new`}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Your First Bot
          </Link>
        </Button>
      </div>
    </Card>
  );
}

async function EmptyOrgState({
  organization,
  params,
}: {
  organization: OrganizationWithRole;
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  return (
    <Card className="border-dashed border-2 p-8">
      <div className="flex flex-col items-center justify-center text-center space-y-6">
        <div className="rounded-full bg-primary/10 p-6">
          <Building className="h-10 w-10 text-primary" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">
            No bots in this organization
          </h3>
          <p className="text-muted-foreground">
            Create your first bot in {organization.name} to get started.
          </p>
        </div>
        <Button asChild>
          <Link href={`/dashboard/${orgId}/bots/new`}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Bot in {organization.name}
          </Link>
        </Button>
      </div>
    </Card>
  );
}
