"use client";

import * as React from "react";
import { toast } from "sonner";
import { Icons } from "@/components/icons";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  pauseConversation,
  resumeConversation,
} from "@/app/actions/conversation-tracking";

interface ConversationPauseToggleProps {
  conversationId: string;
  initialIsPaused: boolean;
}

export function ConversationPauseToggle({
  conversationId,
  initialIsPaused,
}: ConversationPauseToggleProps) {
  const [isPaused, setIsPaused] = React.useState(initialIsPaused);
  const [isPending, startTransition] = React.useTransition();

  const handleTogglePause = React.useCallback(
    (checked: boolean) => {
      startTransition(async () => {
        // Optimistically update the state
        setIsPaused(checked);

        try {
          let result;
          if (checked) {
            result = await pauseConversation(conversationId);
          } else {
            result = await resumeConversation(conversationId);
          }

          if (result.success) {
            toast.success(
              checked
                ? "Conversation paused - bot won't respond to new messages"
                : "Conversation resumed - bot can respond again"
            );
          } else {
            // Revert optimistic update on failure
            setIsPaused(!checked);
            toast.error(
              checked
                ? "Failed to pause conversation"
                : "Failed to resume conversation"
            );
          }
        } catch (error) {
          // Revert optimistic update on error
          setIsPaused(!checked);
          console.error("Error toggling conversation pause:", error);
          toast.error("Failed to update conversation status");
        }
      });
    },
    [conversationId]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icons.Bot className="h-5 w-5" />
          <span>Bot Response Control</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label
              htmlFor="pause-toggle"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Pause Bot Responses
            </Label>
            <p className="text-sm text-muted-foreground">
              When enabled, the bot will not respond to new messages in this
              conversation
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isPending && (
              <div className="size-4 animate-spin rounded-full border-2 border-t-transparent border-current" />
            )}
            <Switch
              id="pause-toggle"
              checked={isPaused}
              onCheckedChange={handleTogglePause}
              disabled={isPending}
            />
          </div>
        </div>

        {isPaused && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-orange-50 border border-orange-200 dark:bg-orange-950 dark:border-orange-800">
            <Icons.Warning className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            <span className="text-sm text-orange-700 dark:text-orange-300">
              Bot responses are currently paused for this conversation
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
