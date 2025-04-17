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
import { getBotById } from "@/lib/queries/cached-queries";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { FileUploader } from "@/components/knowledge/file-uploader";
import { prisma } from "@/lib/db/prisma";
import { KnowledgeFileList } from "@/components/knowledge/knowledge-file-list";
import { KnowledgeBase, KnowledgeFile } from "@/lib/types/prisma";

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
    },
  });

  // Find or create a default knowledge base
  let defaultKnowledgeBase = knowledgeBases.find(
    (kb) => kb.name === "Default Knowledge Base"
  ) as KnowledgeBase | undefined;

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
    };
  }

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
                <BreadcrumbPage>Knowledge</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Knowledge Management</h1>

        <div className="grid grid-cols-1 gap-6">
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
        </div>
      </div>
    </div>
  );
}
