"use client";

import { useState } from "react";
import { Icons } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface SlackChannel {
  channelId: string;
  channelName: string;
  active: boolean;
  configuration_url?: string;
  url?: string;
  settings?: {
    mentionsOnly?: boolean;
    [key: string]: unknown;
  };
}

interface SlackChannelListProps {
  channels: SlackChannel[];
  integrationId?: string;
  deploymentId?: string;
}

export function SlackChannelList({
  channels,
  deploymentId,
}: SlackChannelListProps) {
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  // Function to toggle channel active state
  const toggleChannelActive = async (channel: SlackChannel) => {
    if (!deploymentId) return;

    try {
      setIsUpdating(channel.channelId);

      // Create a new array with the updated channel
      const updatedChannels = channels.map((ch) => {
        if (ch.channelId === channel.channelId) {
          return { ...ch, active: !ch.active };
        }
        return ch;
      });

      // Update the deployment config
      const response = await fetch(`/api/deployments/${deploymentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          config: {
            channels: updatedChannels,
            // Preserve other config values
            globalSettings: {
              defaultResponseTime: "immediate",
            },
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update channel status");
      }

      toast.success(
        `Channel ${channel.active ? "disabled" : "enabled"} successfully`
      );
    } catch (error) {
      console.error("Error updating channel:", error);
      toast.error("Failed to update channel status");
    } finally {
      setIsUpdating(null);
    }
  };

  // Function to remove a channel
  const removeChannel = async (channel: SlackChannel) => {
    if (!deploymentId) return;

    try {
      setIsUpdating(channel.channelId);

      // Filter out the channel to remove
      const updatedChannels = channels.filter(
        (ch) => ch.channelId !== channel.channelId
      );

      // Update the deployment config
      const response = await fetch(`/api/deployments/${deploymentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          config: {
            channels: updatedChannels,
            // Preserve other config values
            globalSettings: {
              defaultResponseTime: "immediate",
            },
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to remove channel");
      }

      toast.success(`Channel #${channel.channelName} removed successfully`);
    } catch (error) {
      console.error("Error removing channel:", error);
      toast.error("Failed to remove channel");
    } finally {
      setIsUpdating(null);
    }
  };

  if (channels.length === 0) {
    return (
      <Card className="bg-muted border-dashed">
        <CardContent className="p-6 text-center">
          <p className="text-sm text-muted-foreground">
            No channels configured. Click &quot;Connect to Slack&quot; to add a
            channel.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {channels.map((channel) => (
        <div
          key={channel.channelId}
          className="flex items-center justify-between p-2 border rounded-md hover:bg-muted/50"
        >
          <div className="flex items-center space-x-2">
            <Badge
              variant={channel.active ? "default" : "outline"}
              className={channel.active ? "" : "text-muted-foreground"}
            >
              {channel.channelName}
            </Badge>
            {channel.active && (
              <Badge
                variant="outline"
                className="bg-green-50 text-green-700 border-green-200"
              >
                Active
              </Badge>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Switch
                    checked={channel.active}
                    onCheckedChange={() => toggleChannelActive(channel)}
                    disabled={isUpdating === channel.channelId}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  {channel.active ? "Disable channel" : "Enable channel"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeChannel(channel)}
                    disabled={isUpdating === channel.channelId}
                  >
                    {isUpdating === channel.channelId ? (
                      <Icons.Spinner className="h-4 w-4 animate-spin" />
                    ) : (
                      <Icons.Trash className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Remove channel</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      ))}
    </div>
  );
}
