"use client";

import { useState } from "react";
import { Message, KnowledgeFile } from "@/lib/generated/prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icons } from "@/components/icons";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  ResponseMessage,
  KnowledgeContext,
} from "../app/(protected)/(sidebar)/dashboard/[orgId]/bots/[botId]/conversations/[conversationId]/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ConversationMessagesProps {
  messages: Message[];
  knowledgeFiles?: KnowledgeFile[];
}

export default function ConversationMessages({
  messages,
  knowledgeFiles = [],
}: ConversationMessagesProps) {
  const [viewMode, setViewMode] = useState<"normal" | "debug">("normal");

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Conversation History</h2>
        <Tabs
          defaultValue="normal"
          onValueChange={(value) => setViewMode(value as "normal" | "debug")}
        >
          <TabsList>
            <TabsTrigger value="normal">Normal View</TabsTrigger>
            <TabsTrigger value="debug">Debug View</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="space-y-4">
        {messages.map((message) => (
          <MessageCard
            key={message.id}
            message={message}
            viewMode={viewMode}
            knowledgeFiles={knowledgeFiles}
          />
        ))}
      </div>
    </div>
  );
}

interface MessageCardProps {
  message: Message;
  viewMode: "normal" | "debug";
  knowledgeFiles?: KnowledgeFile[];
}

function MessageCard({
  message,
  viewMode,
  knowledgeFiles = [],
}: MessageCardProps) {
  const isUser = message.role === "USER";
  let responseMessages: ResponseMessage[] = [];
  let knowledgeContext: KnowledgeContext | null = null;

  try {
    // Handle both string and object formats for responseMessages
    if (message.responseMessages) {
      if (typeof message.responseMessages === "string") {
        // It's a string that needs parsing
        if (message.responseMessages.trim()) {
          responseMessages = JSON.parse(
            message.responseMessages
          ) as ResponseMessage[];
        }
      } else if (Array.isArray(message.responseMessages)) {
        // It's already an array
        responseMessages =
          message.responseMessages as unknown as ResponseMessage[];
      } else if (typeof message.responseMessages === "object") {
        // It's an object, but should be an array
        responseMessages = [
          message.responseMessages,
        ] as unknown as ResponseMessage[];
      }
    }

    // Parse contextUsed for knowledge sources if it exists and this is an assistant message
    if (!isUser && message.contextUsed) {
      try {
        if (typeof message.contextUsed === "string") {
          knowledgeContext = JSON.parse(
            message.contextUsed
          ) as KnowledgeContext;
        } else if (typeof message.contextUsed === "object") {
          knowledgeContext = message.contextUsed as unknown as KnowledgeContext;
        }
      } catch (e) {
        console.error("Error parsing contextUsed:", e);
      }
    }
  } catch (e) {
    console.error("Error processing response messages:", e);
  }

  return (
    <Card
      className={cn(
        "border shadow-sm transition-all overflow-hidden",
        isUser ? "bg-secondary" : "bg-card"
      )}
    >
      <CardHeader className="px-4 py-0 flex flex-row gap-x-2 items-center space-y-0">
        <div className="flex flex-col flex-1">
          <CardTitle className="text-sm font-medium">
            {isUser ? (
              <div className="flex items-center gap-1">
                <Icons.User className="h-3.5 w-3.5" />
                <span>User</span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <Icons.Terminal className="h-3.5 w-3.5" />
                <span>Assistant</span>
              </div>
            )}
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {format(new Date(message.timestamp), "MMM d, yyyy 'at' h:mm a")}
          </span>
        </div>

        {viewMode === "debug" && !isUser && (
          <div className="flex items-center gap-2">
            {message.tokenCount && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-xs">
                      {message.tokenCount} tokens
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      Total tokens used for this response: {message.tokenCount}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {message.processingTime && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-xs">
                      {(message.processingTime / 1000).toFixed(2)}s
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      Time taken to generate this response:{" "}
                      {(message.processingTime / 1000).toFixed(2)} seconds
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="px-4 pb-4">
        <div className="whitespace-pre-wrap text-sm">{message.content}</div>

        {!isUser && viewMode === "debug" && (
          <div className="mt-4 space-y-4">
            {/* Knowledge Sources (only in debug mode) */}
            {knowledgeContext?.hasKnowledgeContext && (
              <div className="border rounded-md p-3 space-y-2">
                <div className="font-medium flex items-center gap-2 text-sm">
                  <Icons.Database className="h-4 w-4" />
                  <span>Knowledge Sources</span>
                </div>

                <div className="pl-3 flex flex-wrap gap-2">
                  {knowledgeContext.documents.map((doc, idx) => {
                    // Find the file matching this document ID
                    const file = knowledgeFiles.find(
                      (f) => f.id === doc.documentId
                    );

                    return (
                      <TooltipProvider key={idx}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center space-x-2 text-sm p-1 rounded hover:bg-muted cursor-default inline-flex w-auto">
                              {getFileIcon(file?.fileType || "")}
                              <span className="truncate max-w-sm">
                                {file?.fileName ||
                                  doc.filename ||
                                  doc.documentId}
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              Confidence Score: {(doc.score * 100).toFixed(2)}%
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Response Messages */}
            {responseMessages.length > 0 && (
              <DebugView responseMessages={responseMessages} />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ResponseViewProps {
  responseMessages: ResponseMessage[];
}

function DebugView({ responseMessages }: ResponseViewProps) {
  return (
    <div className="border rounded-md p-3 space-y-2">
      <div className="font-medium flex items-center gap-2 text-sm">
        <Icons.File className="h-4 w-4" />
        <span>Response Messages</span>
      </div>

      <div className="space-y-2">
        {responseMessages.map((msg, i) => (
          <div key={i} className="border rounded-md p-3 space-y-2">
            <div className="flex items-center justify-between">
              <Badge
                variant={msg.role === "assistant" ? "default" : "secondary"}
              >
                {msg.role}
              </Badge>
              <span className="text-xs text-muted-foreground">
                ID: {msg.id}
              </span>
            </div>

            {msg.content.map((content, j) => (
              <div key={j} className="pl-3 border-l-2 border-muted space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {content.type}
                  </Badge>

                  {content.type !== "text" && content.toolName && (
                    <Badge variant="outline" className="text-[10px]">
                      {content.toolName}
                    </Badge>
                  )}
                </div>

                {content.type === "text" && content.text && (
                  <div className="pl-3 text-sm">{content.text}</div>
                )}

                {content.type === "tool-call" && content.args && (
                  <div className="pl-3">
                    <div className="text-xs text-muted-foreground mb-1">
                      Arguments:
                    </div>
                    <pre className="bg-muted p-2 rounded-md text-xs overflow-x-auto">
                      {JSON.stringify(content.args, null, 2)}
                    </pre>
                  </div>
                )}

                {content.type === "tool-result" && content.result && (
                  <div className="pl-3">
                    <div className="text-xs text-muted-foreground mb-1">
                      Result:
                    </div>
                    <pre className="bg-muted p-2 rounded-md text-xs overflow-x-auto">
                      {JSON.stringify(content.result, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Function to get file icon based on file type (copied from KnowledgeFileList)
function getFileIcon(fileType: string) {
  if (fileType.includes("pdf")) {
    return <Icons.Pdf className="h-4 w-4 text-red-500" />;
  } else if (fileType.includes("spreadsheet") || fileType.includes("excel")) {
    return <Icons.Xls className="h-4 w-4 text-green-600" />;
  } else if (fileType.includes("word") || fileType.includes("document")) {
    return <Icons.Doc className="h-4 w-4 text-blue-500" />;
  } else if (fileType.includes("text/plain")) {
    return <Icons.Txt className="h-4 w-4 text-gray-500" />;
  } else {
    return <Icons.File className="h-4 w-4 text-blue-500" />;
  }
}
