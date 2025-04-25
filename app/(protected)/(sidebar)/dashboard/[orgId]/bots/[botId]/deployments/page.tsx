import { requireAuth } from "@/utils/auth";
import {
  getBotById,
  getInstalledDeployments,
} from "@/lib/queries/cached-queries";
import { Suspense } from "react";

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
import { deployments } from "@/lib/bot-deployments";
import { DeploymentCard } from "@/components/deployment-card";
import { Skeleton } from "@/components/ui/skeleton";

interface PageProps {
  params: Promise<{ orgId: string; botId: string }>;
}

export default async function DeploymentsPage({ params }: PageProps) {
  await requireAuth();
  const { botId, orgId } = await params;

  const botResponse = await getBotById(botId);
  const bot = botResponse?.data;

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
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <Suspense fallback={<DeploymentsLoading />}>
        <DeploymentsContent botId={botId} />
      </Suspense>
    </div>
  );
}

// Loading state component
function DeploymentsLoading() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Deployments</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border rounded-lg p-4 space-y-3">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Main content component
async function DeploymentsContent({ botId }: { botId: string }) {
  // We'll use botId for future DB queries related to this bot
  console.log(`Loading deployments for bot: ${botId}`);

  // Mock data for installed deployments - replace with actual data from your database
  const installedDeployments = await getInstalledDeployments(botId);
  const installedDeploymentTypes: string[] = installedDeployments.data.map(
    (deployment) => deployment.type
  );
  console.log({ installedDeploymentTypes });

  // Filter deployments if needed
  const filteredDeployments = deployments;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Deployments</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDeployments.map((deployment) => {
          // Convert StaticImageData to string URLs if needed
          const imageUrls: string[] = Array.isArray(deployment.images)
            ? deployment.images.map((img: unknown) =>
                typeof img === "string"
                  ? img
                  : img && typeof img === "object" && "src" in img
                  ? (img.src as string)
                  : ""
              )
            : [];

          return (
            <DeploymentCard
              key={deployment.id}
              id={deployment.id}
              logoId={deployment.id}
              name={deployment.name}
              short_description={deployment.short_description}
              description={deployment.description}
              settings={deployment.settings || {}}
              images={imageUrls}
              active={deployment.active}
              category={deployment.category}
              installed={installedDeploymentTypes.includes(
                deployment.deploymentType
              )}
              userSettings={{}}
            />
          );
        })}
      </div>
    </div>
  );
}
