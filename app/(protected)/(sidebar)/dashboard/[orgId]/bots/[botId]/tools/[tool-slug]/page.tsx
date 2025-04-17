import { requireAuth } from "@/utils/auth";
import { getBotById, getBotTool } from "@/lib/queries/cached-queries";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { initializeTools } from "@/lib/tools";
import { notFound } from "next/navigation";
import ToolComponentWrapper from "@/components/tools/tool-component-wrapper";
import InstallToolCard from "@/components/tools/install-tool-card";

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
}

interface PageProps {
  params: Promise<{ orgId: string; botId: string; "tool-slug": string }>;
}

export default async function ToolDetailPage({ params }: PageProps) {
  await requireAuth();
  const { botId, orgId, "tool-slug": toolSlug } = await params;

  // Fetch bot data
  const botResponse = await getBotById(botId);
  const bot = botResponse?.data;

  if (!bot) {
    notFound();
  }

  // Initialize and get specific tool from registry
  const { toolRegistry } = initializeTools();
  const tool = toolRegistry.get(toolSlug);

  // If tool not found in registry, return 404
  if (!tool) {
    notFound();
  }

  // Check if the tool is installed for this bot
  const botToolResponse = await getBotTool(botId, toolSlug);
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
  };

  // Map tool types to their corresponding icons
  const iconMap: Record<string, React.ReactNode> = {
    CALENDAR_BOOKING: <Icons.Calendar className="h-5 w-5" />,
    CONTACT_FORM: <Icons.MessageCircle className="h-5 w-5" />,
    CRM_TAG: <Icons.Database className="h-5 w-5" />,
    DATA_QUERY: <Icons.Database className="h-5 w-5" />,
    CUSTOM: <Icons.Settings className="h-5 w-5" />,
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
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-md bg-muted">
            {iconMap[tool.type] || <Icons.Hammer className="h-5 w-5" />}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{tool.name}</h1>
            <p className="text-muted-foreground">{tool.description}</p>
          </div>
        </div>

        <Alert className="mb-8">
          <Icons.Info className="h-4 w-4" />
          <AlertTitle>Integration Type</AlertTitle>
          <AlertDescription>
            {tool.integrationType
              ? `This tool integrates with ${tool.integrationType} and requires authentication.`
              : "This tool doesn't require any external integration."}
          </AlertDescription>
        </Alert>

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
