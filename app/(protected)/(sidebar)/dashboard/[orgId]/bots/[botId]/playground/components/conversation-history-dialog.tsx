"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Clock, MessageCircle } from "@/components/icons";
import { getPlaygroundConversations } from "@/app/actions/organizations";
import type { Conversation, Message } from "@/lib/generated/prisma";

interface ConversationWithDetails extends Conversation {
  messages: Pick<Message, "content" | "timestamp">[];
  _count: {
    messages: number;
  };
}

interface ConversationHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  botId: string;
  onSelectConversation: (conversationId: string) => void;
}

export default function ConversationHistoryDialog({
  open,
  onOpenChange,
  botId,
  onSelectConversation,
}: ConversationHistoryDialogProps) {
  const [conversations, setConversations] = useState<ConversationWithDetails[]>(
    []
  );
  const [loading, setLoading] = useState(false);

  const fetchConversations = async () => {
    if (!botId || !open) return;

    setLoading(true);
    try {
      const result = await getPlaygroundConversations({ botId, limit: 50 });

      if (result?.data?.success && result.data.data) {
        setConversations(result.data.data as ConversationWithDetails[]);
      } else {
        const errorMessage =
          result?.data?.error?.message || "Failed to load conversations";
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
      toast.error("Failed to load conversations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [botId, open]);

  const handleSelectConversation = (conversationId: string) => {
    onSelectConversation(conversationId);
    onOpenChange(false);
  };

  const getPreviewText = (conversation: ConversationWithDetails) => {
    if (conversation.messages.length === 0) return "No messages";
    return (
      conversation.messages[0].content.slice(0, 100) +
      (conversation.messages[0].content.length > 100 ? "..." : "")
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Past Conversations
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-2">
                No past conversations found
              </p>
              <p className="text-sm text-muted-foreground">
                Start a conversation in the playground to see it appear here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleSelectConversation(conversation.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary" className="text-xs">
                        {conversation._count.messages} messages
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {conversation.endedAt
                          ? format(
                              new Date(conversation.endedAt),
                              "MMM d, yyyy 'at' h:mm a"
                            )
                          : format(
                              new Date(conversation.startedAt),
                              "MMM d, yyyy 'at' h:mm a"
                            )}
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {getPreviewText(conversation)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
