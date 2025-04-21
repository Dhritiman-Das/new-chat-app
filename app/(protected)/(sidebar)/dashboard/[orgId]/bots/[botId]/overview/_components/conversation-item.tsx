"use client";

import { Icons } from "@/components/icons";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import type { Conversation } from "@/lib/generated/prisma";

interface ConversationItemProps {
  conversation: Conversation & {
    messages?: Array<{ content?: string }>;
  };
  orgId: string;
  botId: string;
}

export function ConversationItem({
  conversation,
  orgId,
  botId,
}: ConversationItemProps) {
  // Get message content safely with optional chaining
  const messageContent = conversation.messages?.[0]?.content || "";

  return (
    <div className="flex items-start space-x-4 group">
      <Icons.Clock className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div className="flex-grow min-w-0">
        <div className="font-medium flex items-center justify-between">
          <div>Conversation {conversation.id.substring(0, 8)}</div>
          <Link
            href={`/dashboard/${orgId}/bots/${botId}/conversations/${conversation.id}`}
            className="text-sm text-primary flex items-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            View conversation <Icons.ChevronRight className="ml-1 h-4 w-4" />
          </Link>
        </div>
        <div className="text-sm text-muted-foreground max-w-full pr-4">
          {messageContent.substring(0, 120)}
          {messageContent.length > 120 ? "..." : ""}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(conversation.startedAt), {
            addSuffix: true,
          })}
        </div>
      </div>
    </div>
  );
}
