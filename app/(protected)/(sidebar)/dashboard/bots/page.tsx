import Link from "next/link";
import {
  getUserBots,
  getUserOrganizations,
} from "@/lib/queries/cached-queries";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { Organization } from "@/lib/generated/prisma";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { BotCard, BotWithOrg } from "@/components/bot-card";

// Organization with user role
interface OrganizationWithRole extends Organization {
  role: string;
}

export default async function AllBotsPage() {
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

  // Find organizations that have bots
  const orgsWithBots = typedOrgs.filter(
    (org) => botsByOrg[org.id] && botsByOrg[org.id].length > 0
  );

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
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>All Bots</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="p-6 space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">All Bots</h1>
          {typedOrgs.length > 0 && (
            <Button asChild>
              <Link href={`/dashboard/${typedOrgs[0].id}/bots/new`}>
                <Icons.Add className="mr-2 h-4 w-4" />
                New Bot
              </Link>
            </Button>
          )}
        </div>

        {typedBots.length === 0 ? (
          <EmptyState organizations={typedOrgs} />
        ) : (
          <div className="space-y-10">
            {orgsWithBots.map((org) => (
              <div key={org.id} className="space-y-4">
                <div className="flex items-center space-x-4">
                  <OrganizationAvatar organization={org} />
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-semibold">{org.name}</h2>
                      <Badge variant="outline">
                        {org.plan.charAt(0) + org.plan.slice(1).toLowerCase()}{" "}
                        Plan
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {botsByOrg[org.id]?.length}{" "}
                      {botsByOrg[org.id]?.length === 1 ? "bot" : "bots"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {botsByOrg[org.id]?.map((bot) => (
                    <BotCard key={bot.id} bot={bot} orgId={org.id} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
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

function EmptyState({
  organizations,
}: {
  organizations: OrganizationWithRole[];
}) {
  return (
    <Card className="border-dashed border-2 p-8">
      <div className="flex flex-col items-center justify-center text-center space-y-6">
        <div className="rounded-full bg-primary/10 p-6">
          <Icons.Bot className="h-10 w-10 text-primary" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">No bots yet</h3>
          <p className="text-muted-foreground">
            Create your first bot to start building conversational experiences.
          </p>
        </div>
        {organizations.length > 0 && (
          <Button asChild>
            <Link href={`/dashboard/${organizations[0].id}/bots/new`}>
              <Icons.Add className="mr-2 h-4 w-4" />
              Create Your First Bot
            </Link>
          </Button>
        )}
      </div>
    </Card>
  );
}
