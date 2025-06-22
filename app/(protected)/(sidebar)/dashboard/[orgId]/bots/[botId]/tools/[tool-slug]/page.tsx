import { requireAuth } from "@/utils/auth";
import {
  getBotById,
  getBotTool,
  getOrganizationById,
} from "@/lib/queries/cached-queries";
import { prisma } from "@/lib/db/prisma";
import React from "react";
import { z } from "zod";
import { Icons } from "@/components/icons";
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
import { notFound } from "next/navigation";
import ToolComponentWrapper from "@/components/tools/tool-component-wrapper";
import InstallToolCard from "@/components/tools/install-tool-card";
import { AuthRequirement } from "@/lib/tools/definitions/tool-interface";
import { BackButton } from "@/components/back-button";
import ToggleToolStatus from "@/components/tools/toggle-tool-status";

// Define a serializable tool interface without function references
interface SerializableTool {
  id: string;
  name: string;
  description: string;
  type: string;
  integrationType?: string;
  version: string;
  defaultConfig?: Record<string, unknown>;
  functionsMeta: Record<string, { description: string }>;
  auth?: AuthRequirement;
  moreDetailsDialog?: React.ReactNode;
  beta?: boolean;
}

interface PageProps {
  params: Promise<{ orgId: string; botId: string; "tool-slug": string }>;
}

export default async function ToolDetailPage({ params }: PageProps) {
  await requireAuth();
  const { botId, orgId, "tool-slug": toolSlug } = await params;

  // Fetch bot data
  const [{ data: bot }, { data: organization }] = await Promise.all([
    getBotById(botId),
    getOrganizationById(orgId),
  ]);

  if (!bot) {
    notFound();
  }

  // Initialize and get specific tool from registry
  const { toolRegistry } = await initializeTools();
  let tool = toolRegistry.get(toolSlug);

  // If tool not found in registry, check if it's a custom tool (public tools or tools created by this bot)
  if (!tool) {
    const customTool = await prisma.tool.findFirst({
      where: {
        id: toolSlug,
        type: "CUSTOM",
        OR: [
          { createdByBotId: null }, // Public/admin tools
          { createdByBotId: botId }, // Tools created by this bot
        ],
      },
    });

    if (customTool) {
      // Create a tool-like object for custom tools (partial for UI display)
      tool = {
        id: customTool.id,
        name: customTool.name,
        description: customTool.description || "",
        type: "CUSTOM",
        version: customTool.version,
        icon: <Icons.Settings className="w-[32px] h-[32px]" />,
        functions: {},
        integrationType: customTool.integrationType || undefined,
        defaultConfig: customTool.requiredConfigs as Record<string, unknown>,
        configSchema: z.object({}), // Add missing required property
        getCredentialSchema: () => z.object({}), // Add missing required method
      };
    }
  }

  // If tool still not found, return 404
  if (!tool) {
    notFound();
  }

  // Check if the tool is installed for this bot
  const botToolResponse = await getBotTool(botId, toolSlug);
  console.log("botToolResponse", botToolResponse);
  const botTool = botToolResponse?.data;
  const isToolInstalled = !!botTool;

  // Create a serializable version of the tool without function references
  const serializableTool: SerializableTool = {
    id: tool.id,
    name: tool.name,
    description: tool.description,
    type: tool.type,
    integrationType: tool.integrationType,
    version: tool.version,
    defaultConfig: tool.defaultConfig as Record<string, unknown>,
    // Include function metadata but not the actual functions
    functionsMeta: Object.fromEntries(
      Object.entries(tool.functions).map(([name, func]) => [
        name,
        {
          description: func.description,
          // We could include parameter schemas here if needed
        },
      ])
    ),
    // Include auth requirements
    auth: tool.auth,
    moreDetailsDialog: tool.moreDetailsDialog,
    beta: tool.beta,
  };

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
                <BreadcrumbLink
                  href={`/dashboard/${orgId}/bots/${botId}/tools`}
                >
                  Tools
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{tool.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <BackButton />

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-muted">{tool.icon}</div>
              <div>
                <h1 className="text-2xl font-bold">{tool.name}</h1>
                <p className="text-muted-foreground">{tool.description}</p>
              </div>
            </div>
          </div>
          <ToggleToolStatus
            botId={botId}
            toolId={toolSlug}
            isActive={botTool?.isEnabled ?? false}
          />
        </div>

        {/* Conditionally render either the installation card or the tool component */}
        {isToolInstalled ? (
          // Tool is installed, show the configuration component
          <ToolComponentWrapper
            toolSlug={toolSlug}
            tool={serializableTool}
            botId={botId}
            orgId={orgId}
          />
        ) : (
          // Tool is not installed, show the installation card
          <InstallToolCard tool={serializableTool} botId={botId} />
        )}
      </div>
    </div>
  );
}
