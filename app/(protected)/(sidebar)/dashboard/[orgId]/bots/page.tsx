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
import { BotCard, BotWithOrg } from "@/components/bot-card";

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

  // Filter bots for the current organization
  const orgBots = typedBots.filter((bot) => bot.organization.id === orgId);

  // Find current organization
  const currentOrg = typedOrgs.find((org) => org.id === orgId);

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
                  {currentOrg?.slug || orgId}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Bots</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">Your Bots</h1>
            {currentOrg && (
              <p className="text-sm text-muted-foreground">
                {currentOrg.name} •
                <span className="ml-1">
                  {currentOrg.plan.charAt(0) +
                    currentOrg.plan.slice(1).toLowerCase()}{" "}
                  Plan
                </span>
              </p>
            )}
          </div>
          <Button asChild>
            <Link href={`/dashboard/${orgId}/bots/new`}>
              <Icons.Add className="mr-2 h-4 w-4" />
              New Bot
            </Link>
          </Button>
        </div>

        <div className="space-y-6">
          {orgBots.length === 0 ? (
            <EmptyState params={params} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {orgBots.map((bot) => (
                <BotCard key={bot.id} bot={bot} orgId={orgId} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

async function EmptyState({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;

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
        <Button asChild>
          <Link href={`/dashboard/${orgId}/bots/new`}>
            <Icons.Add className="mr-2 h-4 w-4" />
            Create Your First Bot
          </Link>
        </Button>
      </div>
    </Card>
  );
}
