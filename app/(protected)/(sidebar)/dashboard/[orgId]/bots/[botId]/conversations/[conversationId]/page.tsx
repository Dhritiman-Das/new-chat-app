import { requireAuth } from "@/utils/auth";
import { getConversationById, getBotById } from "@/lib/queries/cached-queries";
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
import ConversationMessages from "../../../../../../../../../components/components/conversation-messages";
import { Icons } from "@/components/icons";
import { format } from "date-fns";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ConversationWithMessages } from "./types";

interface PageProps {
  params: Promise<{ orgId: string; botId: string; conversationId: string }>;
}

export default async function ConversationDetailPage({ params }: PageProps) {
  await requireAuth();
  const { botId, orgId, conversationId } = await params;

  // Get bot and conversation data
  const [botResponse, conversationResponse] = await Promise.all([
    getBotById(botId),
    getConversationById(conversationId),
  ]);

  const bot = botResponse?.data;
  const conversation =
    conversationResponse?.data as ConversationWithMessages | null;

  return (
    <div className="flex flex-col min-h-screen">
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
                  href={`/dashboard/${orgId}/bots/${botId}/conversations`}
                >
                  Conversations
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{conversationId}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex-1 p-6 space-y-6">
        {!conversation ? (
          <Alert variant="destructive">
            <Icons.Warning className="h-4 w-4" />
            <AlertTitle>Conversation not found</AlertTitle>
            <AlertDescription>
              The conversation you are looking for could not be found or you
              don&apos;t have permission to view it.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icons.MessageSquare className="h-5 w-5" />
                  <span>Conversation Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      Started
                    </div>
                    <div>
                      {format(new Date(conversation.startedAt), "PPP p")}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      Status
                    </div>
                    <div className="capitalize">
                      {conversation.status.toLowerCase()}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      Source
                    </div>
                    <div>{conversation.source || "Unknown"}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div>
              {conversation.messages && conversation.messages.length > 0 ? (
                <ConversationMessages
                  messages={conversation.messages}
                  knowledgeFiles={
                    conversation.bot?.knowledgeBases?.flatMap(
                      (kb) => kb.files
                    ) || []
                  }
                />
              ) : (
                <Alert>
                  <Icons.Info className="h-4 w-4" />
                  <AlertTitle>No messages</AlertTitle>
                  <AlertDescription>
                    This conversation doesn&apos;t have any messages yet.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
