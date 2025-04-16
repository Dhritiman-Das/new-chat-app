import { requireAuth } from "@/utils/auth";
import { getBotById } from "@/lib/queries/cached-queries";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import Link from "next/link";
import { initializeTools } from "@/lib/tools";

interface PageProps {
  params: Promise<{ orgId: string; botId: string }>;
}

export default async function ToolsPage({ params }: PageProps) {
  await requireAuth();
  const { botId, orgId } = await params;

  // Fetch bot data
  const botResponse = await getBotById(botId);
  const bot = botResponse?.data;

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
            // Map tool types to their corresponding icons
            const iconMap: Record<string, React.ReactNode> = {
              CALENDAR_BOOKING: <Icons.Calendar className="h-5 w-5" />,
              CONTACT_FORM: <Icons.MessageCircle className="h-5 w-5" />,
              CRM_TAG: <Icons.Database className="h-5 w-5" />,
              DATA_QUERY: <Icons.Database className="h-5 w-5" />,
              CUSTOM: <Icons.Settings className="h-5 w-5" />,
            };

            return (
              <Card key={tool.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{tool.name}</CardTitle>
                    <div className="p-1 rounded-md bg-muted">
                      {iconMap[tool.type] || (
                        <Icons.Hammer className="h-5 w-5" />
                      )}
                    </div>
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
