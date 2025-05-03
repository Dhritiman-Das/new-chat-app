"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Icons } from "@/components/icons";
import { updateGoHighLevelChannels } from "@/app/actions/gohighlevel";
import { GoHighLevelMessageType } from "@/lib/bot-deployments/gohighlevel/types";

interface GoHighLevelChannelListProps {
  channels: Array<{
    type: GoHighLevelMessageType;
    active: boolean;
    settings?: Record<string, unknown>;
  }>;
  integrationId: string;
  deploymentId?: string;
}

const CHANNEL_TYPES: { type: GoHighLevelMessageType; label: string }[] = [
  { type: "SMS", label: "SMS" },
  { type: "Email", label: "Email" },
  { type: "CALL", label: "Call" },
  { type: "Custom", label: "Voicemail" },
  { type: "FB", label: "Facebook" },
  { type: "IG", label: "Instagram" },
  { type: "Live_Chat", label: "Live Chat" },
  { type: "WhatsApp", label: "WhatsApp" },
];

export function GoHighLevelChannelList({
  channels = [],
  integrationId,
  deploymentId,
}: GoHighLevelChannelListProps) {
  const [selectedChannels, setSelectedChannels] = useState<
    Array<{
      type: GoHighLevelMessageType;
      active: boolean;
    }>
  >(
    // Initialize with existing channels or default to all channels disabled
    channels.length > 0
      ? channels
      : CHANNEL_TYPES.map((c) => ({ type: c.type, active: false }))
  );

  const [isUpdating, setIsUpdating] = useState(false);

  const handleChannelToggle = (
    type: GoHighLevelMessageType,
    checked: boolean
  ) => {
    setSelectedChannels((prev) =>
      prev.map((channel) =>
        channel.type === type ? { ...channel, active: checked } : channel
      )
    );
  };

  const handleSaveChannels = async () => {
    try {
      setIsUpdating(true);

      const result = await updateGoHighLevelChannels({
        integrationId,
        deploymentId,
        channels: selectedChannels,
      });

      if (result?.data?.success) {
        toast.success("Channels updated successfully");
      } else {
        const errorMsg =
          result?.data?.error?.message || "Failed to update channels";
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error("Error updating channels:", error);
      toast.error("Failed to update channels. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  if (selectedChannels.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No channels available
      </div>
    );
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-base">Configure Channels</CardTitle>
        <CardDescription>
          Select which GoHighLevel channels to monitor for AI responses
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {CHANNEL_TYPES.map((channelType) => {
            const channel = selectedChannels.find(
              (c) => c.type === channelType.type
            ) || { type: channelType.type, active: false };

            return (
              <div
                key={channelType.type}
                className="flex items-center space-x-2 border p-3 rounded-md"
              >
                <Checkbox
                  id={`channel-${channelType.type}`}
                  checked={channel.active}
                  onCheckedChange={(checked) =>
                    handleChannelToggle(channelType.type, checked === true)
                  }
                />
                <label
                  htmlFor={`channel-${channelType.type}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1"
                >
                  {channelType.label}
                </label>
                {channel.active && (
                  <Badge
                    variant="outline"
                    className="bg-green-50 text-green-700 border-green-200"
                  >
                    Active
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button onClick={handleSaveChannels} disabled={isUpdating}>
          {isUpdating ? (
            <>
              <Icons.Spinner className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Icons.Check className="mr-2 h-4 w-4" />
              Save Channels
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
