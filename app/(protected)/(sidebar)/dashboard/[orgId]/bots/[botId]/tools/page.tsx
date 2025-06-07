import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

import { initializeTools } from "@/lib/tools";
import {
  getBotById,
  getBotAllTools,
  getOrganizationById,
} from "@/lib/queries/cached-queries";
import { requireAuth } from "@/utils/auth";
import { Icons } from "@/components/icons";
import { prisma } from "@/lib/db/prisma";
import { createCustomToolDefinition } from "@/lib/tools/custom-tool";

interface PageProps {
  params: Promise<{ orgId: string; botId: string }>;
}

export default async function ToolsPage({ params }: PageProps) {
  await requireAuth();
  const { botId, orgId } = await params;

  // Fetch bot data and organization
  const [botResponse, botToolsResponse, organizationResponse] =
    await Promise.all([
      getBotById(botId),
      getBotAllTools(botId),
      getOrganizationById(orgId),
    ]);

  const bot = botResponse?.data;
  const botTools = botToolsResponse.data;
  const organization = organizationResponse?.data;

  // Map tool IDs to enabled status for quick lookup
  const enabledToolsMap = new Map(
    botTools.map((botTool) => [botTool.toolId, botTool.isEnabled])
  );

  // Initialize and get tools from registry (public tools only)
  const { toolRegistry } = await initializeTools();
  const registryTools = toolRegistry.getAll();

  // Also fetch custom tools created by this specific bot
  const botSpecificTools = await prisma.tool.findMany({
    where: {
      type: "CUSTOM",
      isActive: true,
      createdByBotId: botId,
    },
  });

  // Convert bot-specific tools to the same format as registry tools
  const botSpecificToolsFormatted = botSpecificTools.map((tool) => {
    return createCustomToolDefinition({
      id: tool.id,
      name: tool.name,
      description: tool.description || "",
      functions: tool.functions as Record<string, unknown>,
      functionsSchema: tool.functionsSchema as Record<string, unknown>,
      requiredConfigs: tool.requiredConfigs as Record<string, unknown>,
    });
  });

  // Combine public tools and bot-specific tools
  // This shows: 1) Public/admin tools (available to all bots) 2) Custom tools created by this specific bot
  const tools = [...registryTools, ...botSpecificToolsFormatted];

  console.log({ tools });

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
                <BreadcrumbPage>Tools</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Bot Tools</h1>
            <p className="text-muted-foreground">
              Configure and manage tools that your bot can use to perform
              actions.
            </p>
          </div>
          <Button asChild>
            <Link href={`/dashboard/${orgId}/bots/${botId}/tools/new`}>
              <Icons.Add className="w-4 h-4 mr-2" />
              Create Custom Tool
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool) => {
            // Check if this tool is enabled
            const isEnabled = enabledToolsMap.get(tool.id) === true;

            return (
              <Card key={tool.id} className="overflow-hidden group relative">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{tool.name}</CardTitle>
                      {isEnabled && (
                        <Badge
                          variant="secondary"
                          className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 transition-all duration-200 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/50"
                        >
                          In use
                        </Badge>
                      )}
                    </div>
                    <div className="p-1 rounded-md bg-muted">{tool.icon}</div>
                  </div>
                  <CardDescription className="line-clamp-2 h-10">
                    {tool.description}
                  </CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button asChild className="w-full" size="sm">
                    <Link
                      href={`/dashboard/${orgId}/bots/${botId}/tools/${tool.id}`}
                    >
                      Configure
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
