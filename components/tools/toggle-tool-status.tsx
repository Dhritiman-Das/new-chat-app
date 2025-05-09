"use client";

import { toggleBotToolActiveStatus } from "@/app/actions/bot-tool";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "../ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

export default function ToggleToolStatus({
  botId,
  toolId,
  isActive: initialIsActive,
}: {
  botId: string;
  toolId: string;
  isActive: boolean;
}) {
  const [isActive, setIsActive] = useState(initialIsActive);
  const [isLoading, setIsLoading] = useState(false);

  async function handleToggle() {
    // Optimistic update
    setIsActive(!isActive);
    setIsLoading(true);

    try {
      const response = await toggleBotToolActiveStatus({
        botId,
        toolId,
        active: !isActive,
      });

      if (!response?.data?.success) {
        // Revert optimistic update if action failed
        setIsActive(isActive);
        toast.error(
          response?.data?.error?.message || "Failed to toggle tool status"
        );
      } else {
        const message =
          response?.data?.data?.message || "Tool status updated successfully";
        toast.success(message);
      }
    } catch (error: unknown) {
      // Revert optimistic update if there was an error
      setIsActive(isActive);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An error occurred while updating tool status";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex items-center space-x-2">
      <Switch
        id={`toggle-tool-${toolId}`}
        checked={isActive}
        onCheckedChange={handleToggle}
        disabled={isLoading}
        className={cn(isLoading && "opacity-50 cursor-not-allowed")}
      />
      <Tooltip>
        <TooltipTrigger>
          <Badge
            variant={isActive ? "default" : "outline"}
            className={cn(
              "text-sm font-medium leading-none",
              isLoading && "opacity-50 cursor-not-allowed"
            )}
          >
            {isActive ? "Enabled" : "Disabled"}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          {isActive
            ? "This tool is currently enabled for this bot"
            : "This tool is currently disabled for this bot"}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
