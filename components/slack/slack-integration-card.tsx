"use client";

import { useState } from "react";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Link from "next/link";
import { SlackConnectButton } from "./slack-connect-button";
import {
  SlackDeploymentConfig,
  SlackIntegrationConfig,
} from "@/app/(protected)/(sidebar)/dashboard/[orgId]/bots/[botId]/deployments/slack/utils";
import { SlackChannelList } from "./slack-channel-list";
import { deploymentLogos } from "@/lib/bot-deployments";

interface SlackIntegrationProps {
  integration?: {
    id: string;
    name: string;
    connectionStatus: string;
    metadata: {
      team_name?: string;
      channel?: string;
    };
    config?: SlackIntegrationConfig;
    deployment?: {
      id: string;
      config: SlackDeploymentConfig;
    } | null;
  };
  botId: string;
  orgId: string;
}

export function SlackIntegrationCard({
  integration,
  botId,
  orgId,
}: SlackIntegrationProps) {
  const [isRemoving, setIsRemoving] = useState(false);
  const LogoComponent =
    deploymentLogos["slack" as keyof typeof deploymentLogos];

  const handleRemoveIntegration = async () => {
    try {
      setIsRemoving(true);
      const response = await fetch(`/api/integrations/${integration?.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Slack integration removed successfully");
        // Reload the page to reflect changes
        window.location.reload();
      } else {
        throw new Error("Failed to remove integration");
      }
    } catch (error) {
      console.error("Error removing Slack integration:", error);
      toast.error("Failed to remove Slack integration. Please try again.");
    } finally {
      setIsRemoving(false);
    }
  };

  const isConnected =
    integration && integration.connectionStatus === "CONNECTED";

  // Get channel information from deployment config
  const channels = integration?.deployment?.config.channels || [];

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CardTitle className="text-xl">Slack Integration</CardTitle>
          </div>
          {isConnected && (
            <Badge
              variant="outline"
              className="bg-green-50 text-green-700 border-green-200"
            >
              Connected
            </Badge>
          )}
        </div>
        <CardDescription>
          Connect your bot to Slack and enable conversations in channels.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isConnected ? (
          <div className="space-y-4">
            <div className="rounded-md bg-muted p-4">
              <div className="grid gap-2">
                <div className="flex justify-between">
                  <div className="text-sm font-medium">Workspace</div>
                  <div className="text-sm">
                    {integration.metadata.team_name || "Unknown"}
                  </div>
                </div>
                <div className="flex justify-between">
                  <div className="text-sm font-medium">Integration ID</div>
                  <div className="text-sm truncate max-w-[180px]">
                    {integration.id}
                  </div>
                </div>
              </div>
            </div>

            {/* Channels Section */}
            <div className="border rounded-md p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium">Channels</h3>
                <SlackConnectButton
                  botId={botId}
                  orgId={orgId}
                  variant="outline"
                  size="sm"
                  isAddingChannel={true}
                  integrationId={integration.id}
                />
              </div>

              <SlackChannelList
                channels={channels}
                integrationId={integration.id}
                deploymentId={integration.deployment?.id}
              />
            </div>

            <div className="border-t pt-4">
              <h3 className="text-sm font-medium mb-2">Getting Started</h3>
              <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                <li>
                  Invite <code>@YourBot</code> to any channel
                </li>
                <li>Start a conversation by mentioning the bot</li>
                <li>Use slash commands for quick actions (if configured)</li>
              </ol>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
            <div className="bg-muted rounded-full p-3">
              {LogoComponent ? (
                <LogoComponent />
              ) : (
                <div className="h-6 w-6 bg-muted rounded-md" />
              )}
            </div>
            <div>
              <h3 className="font-medium">Not Connected</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Connect your bot to Slack to start conversations.
              </p>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-4">
        {isConnected ? (
          <>
            <Button variant="outline" asChild>
              <Link
                href={`/dashboard/${orgId}/bots/${botId}/deployments/slack/settings`}
              >
                <Icons.Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveIntegration}
              disabled={isRemoving}
            >
              {isRemoving ? (
                <Icons.Spinner className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Icons.Trash className="mr-2 h-4 w-4" />
              )}
              Remove
            </Button>
          </>
        ) : (
          <SlackConnectButton botId={botId} orgId={orgId} />
        )}
      </CardFooter>
    </Card>
  );
}
