import { requireAuth } from "@/utils/auth";
import {
  getConversationById,
  getBotById,
  getOrganizationById,
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
import { Icons } from "@/components/icons";
import { format } from "date-fns";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import ConversationMessages from "@/components/conversation-messages";
import { BackButton } from "@/components/back-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface PageProps {
  params: Promise<{ orgId: string; botId: string; conversationId: string }>;
}

export default async function ConversationDetailPage({ params }: PageProps) {
  await requireAuth();
  const { botId, orgId, conversationId } = await params;

  // Get bot and conversation data
  const [{ data: bot }, { data: conversation }, { data: organization }] =
    await Promise.all([
      getBotById(botId),
      getConversationById(conversationId),
      getOrganizationById(orgId),
    ]);

  // Map source to icon
  const getSourceIcon = (source: string | null) => {
    switch (source) {
      case "playground":
        return <Icons.Terminal className="h-4 w-4" />;
      case "iframe":
        return <Icons.Code className="h-4 w-4" />;
      case "slack":
        return <Icons.Slack className="h-4 w-4" />;
      case "gohighlevel":
        return <Icons.Highlevel className="h-4 w-4" />;
      default:
        return <Icons.MessageSquare className="h-4 w-4" />;
    }
  };

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

      <div className="flex-1 overflow-y-auto p-6 pb-16">
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
          <div className="mx-auto w-full space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <BackButton />

                <div className="flex items-center gap-3">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                      Conversation Details
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      Viewing conversation history and interactions
                    </p>
                  </div>
                </div>
              </div>
            </div>

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
                      Total messages
                    </div>
                    <div className="capitalize">
                      {conversation.messages.length}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      Source
                    </div>
                    <div className="flex items-center gap-1.5">
                      {getSourceIcon(conversation.source)}
                      <span className="capitalize">
                        {conversation.source || "Unknown"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Compact lead and appointment badges */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {conversation.leads && conversation.leads.length > 0 && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1"
                        >
                          <Icons.LeadCapture className="h-4 w-4" />
                          <span>
                            {conversation.leads.length > 1
                              ? `${conversation.leads.length} Leads`
                              : "1 Lead"}
                          </span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Leads Captured</DialogTitle>
                          <DialogDescription>
                            Details of leads captured during this conversation
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 mt-2">
                          {conversation.leads.map((lead) => (
                            <div
                              key={lead.id}
                              className="grid grid-cols-1 gap-2 p-3 border rounded-md"
                            >
                              <div className="grid grid-cols-2 gap-1">
                                <div className="text-sm font-medium">Name</div>
                                <div>{lead.name || "N/A"}</div>
                              </div>
                              <div className="grid grid-cols-2 gap-1">
                                <div className="text-sm font-medium">Email</div>
                                <div>{lead.email || "N/A"}</div>
                              </div>
                              <div className="grid grid-cols-2 gap-1">
                                <div className="text-sm font-medium">Phone</div>
                                <div>{lead.phone || "N/A"}</div>
                              </div>
                              <div className="grid grid-cols-2 gap-1">
                                <div className="text-sm font-medium">
                                  Status
                                </div>
                                <div>
                                  <Badge
                                    variant="outline"
                                    className="capitalize"
                                  >
                                    {lead.status || "New"}
                                  </Badge>
                                </div>
                              </div>
                              {lead.company && (
                                <div className="grid grid-cols-2 gap-1">
                                  <div className="text-sm font-medium">
                                    Company
                                  </div>
                                  <div>{lead.company}</div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}

                  {conversation.appointments &&
                    conversation.appointments.length > 0 && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-1"
                          >
                            <Icons.Calendar className="h-4 w-4" />
                            <span>
                              {conversation.appointments.length > 1
                                ? `${conversation.appointments.length} Appointments`
                                : "1 Appointment"}
                            </span>
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Appointments Booked</DialogTitle>
                            <DialogDescription>
                              Details of appointments scheduled during this
                              conversation
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 mt-2">
                            {conversation.appointments.map((appointment) => (
                              <div
                                key={appointment.id}
                                className="grid grid-cols-1 gap-2 p-3 border rounded-md"
                              >
                                <div className="grid grid-cols-2 gap-1">
                                  <div className="text-sm font-medium">
                                    Title
                                  </div>
                                  <div>
                                    {appointment.title ||
                                      "Untitled appointment"}
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-1">
                                  <div className="text-sm font-medium">
                                    Date
                                  </div>
                                  <div>
                                    {format(
                                      new Date(appointment.startTime),
                                      "PPP"
                                    )}
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-1">
                                  <div className="text-sm font-medium">
                                    Time
                                  </div>
                                  <div>
                                    {format(
                                      new Date(appointment.startTime),
                                      "p"
                                    )}{" "}
                                    -{" "}
                                    {format(new Date(appointment.endTime), "p")}
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-1">
                                  <div className="text-sm font-medium">
                                    Status
                                  </div>
                                  <div>
                                    <Badge
                                      variant={
                                        appointment.status === "confirmed"
                                          ? "default"
                                          : appointment.status === "cancelled"
                                          ? "destructive"
                                          : "outline"
                                      }
                                      className="capitalize"
                                    >
                                      {appointment.status || "Unknown"}
                                    </Badge>
                                  </div>
                                </div>
                                {appointment.location && (
                                  <div className="grid grid-cols-2 gap-1">
                                    <div className="text-sm font-medium">
                                      Location
                                    </div>
                                    <div>{appointment.location}</div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
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
                  websiteSources={
                    conversation.bot?.knowledgeBases?.flatMap(
                      (kb) => kb.websiteSources
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
          </div>
        )}
      </div>
    </div>
  );
}
