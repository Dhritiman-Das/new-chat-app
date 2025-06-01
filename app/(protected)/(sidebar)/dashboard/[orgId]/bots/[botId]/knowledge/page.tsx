import { requireAuth } from "@/utils/auth";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { getBotById, getOrganizationById } from "@/lib/queries/cached-queries";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUploader } from "@/components/knowledge/file-uploader";
import { WebsiteSourceForm } from "@/components/knowledge/website-source-form";
import { prisma } from "@/lib/db/prisma";
import { KnowledgeFileList } from "@/components/knowledge/knowledge-file-list";
import { WebsiteSourceList } from "@/components/knowledge/website-source-list";
import {
  KnowledgeBase,
  KnowledgeFile,
  WebsiteSource,
} from "@/lib/types/prisma";
import {
  getOrganizationUsage,
  getPlanLimits,
} from "@/lib/payment/billing-service";
import { PlanType } from "@/lib/generated/prisma";

interface PageProps {
  params: Promise<{ orgId: string; botId: string }>;
}

export default async function KnowledgePage({ params }: PageProps) {
  await requireAuth();
  const { botId, orgId } = await params;

  // Fetch bot information
  const botResponse = await getBotById(botId);
  const bot = botResponse?.data;

  // Fetch knowledge bases for this bot
  const knowledgeBases = await prisma.knowledgeBase.findMany({
    where: { botId },
    include: {
      files: true,
      websiteSources: true,
    },
  });

  // Find or create a default knowledge base
  let defaultKnowledgeBase = knowledgeBases.find(
    (kb) => kb.name === "Default Knowledge Base"
  ) as
    | (KnowledgeBase & {
        files: KnowledgeFile[];
        websiteSources: WebsiteSource[];
      })
    | undefined;

  if (!defaultKnowledgeBase) {
    // For server-side rendering, we don't want to create here
    // This is handled by the action when first file is uploaded
    defaultKnowledgeBase = {
      id: "default",
      botId,
      name: "Default Knowledge Base",
      description: "Default knowledge base for this bot",
      createdAt: new Date(),
      updatedAt: new Date(),
      files: [] as KnowledgeFile[],
      websiteSources: [] as WebsiteSource[],
    };
  }

  // Fetch website link usage and limits
  const [usageData, subscription, { data: organization }] = await Promise.all([
    getOrganizationUsage(orgId),
    prisma.subscription.findUnique({
      where: { organizationId: orgId },
      select: { planType: true },
    }),
    getOrganizationById(orgId),
  ]);

  // Get plan limits based on subscription plan
  const planType = subscription?.planType || PlanType.HOBBY;
  const planLimits = await getPlanLimits(planType);

  // Find links feature usage and limit
  const linksUsage =
    usageData.find((item) => item.featureName === "links")?.usage || 0;
  const linksLimit =
    planLimits.find((item) => item.featureName === "links")?.value || 0;

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
                <BreadcrumbPage>Knowledge</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Knowledge Management</h1>

        <Tabs defaultValue="files" className="space-y-6">
          <TabsList>
            <TabsTrigger value="files" className="w-24">
              Files
            </TabsTrigger>
            <TabsTrigger value="websites" className="w-24">
              Websites
            </TabsTrigger>
          </TabsList>

          <TabsContent value="files" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Upload Knowledge Files</CardTitle>
                <CardDescription>
                  Upload files to provide knowledge to your bot. Supported
                  formats: PDF, TXT, DOC, DOCX, XLS, XLSX
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FileUploader
                  botId={botId}
                  orgId={orgId}
                  knowledgeBaseId={defaultKnowledgeBase.id}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Knowledge Files</CardTitle>
                <CardDescription>
                  Files that have been uploaded and processed
                </CardDescription>
              </CardHeader>
              <CardContent>
                <KnowledgeFileList
                  botId={botId}
                  orgId={orgId}
                  knowledgeBase={defaultKnowledgeBase}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="websites" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Add Website Source</CardTitle>
                <CardDescription>
                  Add websites to your knowledge base by entering a URL. You can
                  choose to crawl an entire domain or just scrape a single page.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <WebsiteSourceForm
                  botId={botId}
                  orgId={orgId}
                  knowledgeBaseId={defaultKnowledgeBase.id}
                  websiteLinkLimit={linksLimit}
                  websiteLinkUsage={linksUsage}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Website Sources</CardTitle>
                <CardDescription>
                  Websites that have been added to your knowledge base
                </CardDescription>
              </CardHeader>
              <CardContent>
                <WebsiteSourceList
                  botId={botId}
                  orgId={orgId}
                  knowledgeBase={defaultKnowledgeBase}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
