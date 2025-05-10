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
import { GoHighLevelConnectButton } from "./gohighlevel-connect-button";
import { removeGoHighLevelIntegration } from "@/app/actions/gohighlevel";
import { deploymentLogos } from "@/lib/bot-deployments";
import { GoHighLevelDeploymentConfig } from "@/lib/shared/types/gohighlevel";
import { useClipboard } from "@/hooks/use-clipboard";

interface GoHighLevelIntegrationProps {
  integration?: {
    id: string;
    name: string;
    connectionStatus: string;
    metadata: {
      locationName?: string;
      locationId?: string;
    };
    config?: {
      [key: string]: unknown;
    };
    deployment?: {
      id: string;
      config: GoHighLevelDeploymentConfig;
    } | null;
  };
  botId: string;
  orgId: string;
}

export function GoHighLevelIntegrationCard({
  integration,
  botId,
  orgId,
}: GoHighLevelIntegrationProps) {
  const [isRemoving, setIsRemoving] = useState(false);
  const LogoComponent =
    deploymentLogos["gohighlevel" as keyof typeof deploymentLogos];
  const { copy } = useClipboard({
    successMessage: "Integration ID copied to clipboard",
  });

  const handleRemoveIntegration = async () => {
    try {
      setIsRemoving(true);
      const response = await removeGoHighLevelIntegration({
        integrationId: integration!.id,
      });

      if (response?.data?.success) {
        toast.success("GoHighLevel integration removed successfully");
        // Reload the page to reflect changes
        window.location.reload();
      } else {
        const errorMsg =
          response?.data?.error?.message || "Failed to remove integration";
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error("Error removing GoHighLevel integration:", error);
      toast.error(
        "Failed to remove GoHighLevel integration. Please try again."
      );
    } finally {
      setIsRemoving(false);
    }
  };

  const isConnected =
    integration && integration.connectionStatus === "CONNECTED";

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CardTitle className="text-xl">GoHighLevel Integration</CardTitle>
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
          Connect your bot to GoHighLevel and enable conversations across
          multiple channels.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isConnected ? (
          <div className="space-y-4">
            <div className="rounded-md bg-muted p-4">
              <div className="grid gap-2">
                <div className="flex justify-between">
                  <div className="text-sm font-medium">Location</div>
                  <div className="text-sm">
                    {integration.metadata.locationName || "Unknown"}
                  </div>
                </div>
                <div className="flex justify-between">
                  <div className="text-sm font-medium">Location ID</div>
                  <div className="text-sm truncate max-w-[180px]">
                    {integration.metadata.locationId || "Unknown"}
                  </div>
                </div>
                <div className="flex justify-between">
                  <div className="text-sm font-medium">Integration ID</div>
                  <div
                    className="text-sm truncate max-w-[180px] flex items-center cursor-pointer group"
                    onClick={() => copy(integration.id)}
                    title="Click to copy"
                  >
                    {integration.id}
                    <Icons.Copy className="ml-1.5 h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-sm font-medium mb-2">Getting Started</h3>
              <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                <li>Configure your channels above</li>
                <li>
                  Your bot will respond to messages in the selected channels
                </li>
                <li>View conversation history in your GoHighLevel dashboard</li>
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
                Connect your bot to GoHighLevel to start conversations.
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
                href={`/dashboard/${orgId}/bots/${botId}/deployments/gohighlevel/settings`}
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
          <GoHighLevelConnectButton botId={botId} orgId={orgId} />
        )}
      </CardFooter>
    </Card>
  );
}
