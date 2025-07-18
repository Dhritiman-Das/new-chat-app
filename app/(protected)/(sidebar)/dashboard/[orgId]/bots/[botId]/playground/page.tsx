import { requireAuth } from "@/utils/auth";
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
import { getAvailableModels } from "@/lib/models";
import { getBotById, getOrganizationById } from "@/lib/queries/cached-queries";
import { getModelCreditCosts } from "@/app/actions/models";
import ModelComparison from "./components/model-comparison";

interface PageProps {
  params: Promise<{ orgId: string; botId: string }>;
}

export default async function PlaygroundPage({ params }: PageProps) {
  await requireAuth();
  const { orgId, botId } = await params;
  const availableModels = getAvailableModels();

  // Fetch bot and organization data, and model credit costs
  const [botResponse, organizationResponse, modelCreditCosts] =
    await Promise.all([
      getBotById(botId),
      getOrganizationById(orgId),
      getModelCreditCosts(),
    ]);

  const bot = botResponse?.data;
  const organization = organizationResponse?.data;

  // Get bot's default model ID if it exists
  const defaultModelId = bot
    ? ((bot as Record<string, unknown>).defaultModelId as string | null)
    : null;

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
                <BreadcrumbPage>Playground</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="p-6 h-[calc(100vh-4rem)] flex flex-col">
        {/* <h1 className="text-2xl font-bold mb-6">AI Playground</h1> */}
        <ModelComparison
          models={availableModels}
          botId={botId}
          defaultModelId={defaultModelId}
          modelCreditCosts={modelCreditCosts}
        />
      </div>
    </div>
  );
}
