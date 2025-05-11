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
import { getBotById, getBotAllTools } from "@/lib/queries/cached-queries";
import { requireAuth } from "@/utils/auth";

interface PageProps {
  params: Promise<{ orgId: string; botId: string }>;
}

export default async function ToolsPage({ params }: PageProps) {
  await requireAuth();
  const { botId, orgId } = await params;

  // Fetch bot data
  const botResponse = await getBotById(botId);
  const bot = botResponse?.data;

  // Get all bot tools including disabled ones
  const botToolsResponse = await getBotAllTools(botId);
  const botTools = botToolsResponse.data;

  // Map tool IDs to enabled status for quick lookup
  const enabledToolsMap = new Map(
    botTools.map((botTool) => [botTool.toolId, botTool.isEnabled])
  );

  // Initialize and get tools from registry
  const { toolRegistry } = initializeTools();
  const tools = toolRegistry.getAll();

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
                <BreadcrumbPage>Tools</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Bot Tools</h1>
        <p className="text-muted-foreground mb-8">
          Configure and manage tools that your bot can use to perform actions.
        </p>

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
