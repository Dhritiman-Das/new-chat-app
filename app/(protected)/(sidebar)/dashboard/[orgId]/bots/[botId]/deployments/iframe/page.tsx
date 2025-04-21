import { requireAuth } from "@/utils/auth";
import {
  getBotById,
  getIframeConfigForBot,
} from "@/lib/queries/cached-queries";

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
import {
  ConfigurePanel,
  IframeConfig,
  IframePreview,
} from "@/app/components/iframe";

interface PageProps {
  params: Promise<{ orgId: string; botId: string }>;
}

export default async function DeploymentsIframePage({ params }: PageProps) {
  await requireAuth();
  const { botId, orgId } = await params;

  const botResponse = await getBotById(botId);
  const configResponse = await getIframeConfigForBot(botId);

  const bot = botResponse?.data;
  const iframeConfig = configResponse?.data || {};

  return (
    <div className="flex flex-col h-full">
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
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Iframe</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="p-6 flex flex-1 gap-6 overflow-hidden">
        <div className="w-2/5 overflow-auto">
          <h1 className="text-2xl font-bold mb-6">Iframe Configuration</h1>
          <ConfigurePanel
            botId={botId}
            initialConfig={iframeConfig as Partial<IframeConfig>}
          />
        </div>
        <div className="w-3/5 overflow-auto">
          <h1 className="text-2xl font-bold mb-6">Preview</h1>
          <div className="border rounded-lg h-[calc(100vh-12rem)]">
            <IframePreview
              botId={botId}
              config={iframeConfig as Partial<IframeConfig>}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
