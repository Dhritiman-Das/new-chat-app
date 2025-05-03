"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { toast } from "sonner";
import { initiateGoHighLevelConnection } from "@/app/actions/gohighlevel";

interface GoHighLevelConnectButtonProps {
  botId: string;
  orgId: string;
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  isAddingChannel?: boolean;
  integrationId?: string;
}

export function GoHighLevelConnectButton({
  botId,
  orgId,
  variant = "default",
  size = "default",
  isAddingChannel = false,
  integrationId,
}: GoHighLevelConnectButtonProps) {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      // First, initiate the connection and get a state
      const result = await initiateGoHighLevelConnection({
        botId,
        orgId,
        isAddingChannel: isAddingChannel,
        integrationId: integrationId,
      });

      // Check if result exists and handle the response based on its structure
      if (!result || typeof result !== "object" || !("data" in result)) {
        toast.error("Failed to prepare GoHighLevel connection");
        return;
      }

      // The action response may have different shapes, handle them safely
      if (
        result.data &&
        typeof result.data === "object" &&
        "success" in result.data
      ) {
        if (!result.data.success) {
          const errorMsg =
            result.data.error?.message ||
            "Failed to prepare GoHighLevel connection";
          toast.error(errorMsg);
          return;
        }

        // Safely store state if it exists
        if (
          typeof window !== "undefined" &&
          result.data.data &&
          typeof result.data.data === "object" &&
          "state" in result.data.data
        ) {
          sessionStorage.setItem(
            "goHighLevelOAuthState",
            String(result.data.data.state)
          );
        }
      } else {
        // Handle different response format if needed
        toast.error("Invalid response from server");
        return;
      }

      // Open the GoHighLevel OAuth window
      const state =
        typeof window !== "undefined"
          ? sessionStorage.getItem("goHighLevelOAuthState")
          : null;

      // Note: Using leadconnector in the URL to avoid GoHighLevel's restrictions
      const response = await fetch(
        "/api/apps/gohighlevel/install-url" + (state ? `?state=${state}` : "")
      ).then((res) => res.json());

      const { url } = response;

      const width = 600;
      const height = 800;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2.5;

      const popup = window.open(
        url,
        "",
        `toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width=${width}, height=${height}, top=${top}, left=${left}`
      );

      // The popup might have been blocked, so we redirect the user to the URL instead
      if (!popup) {
        window.location.href = url;
        return;
      }

      const listener = (e: MessageEvent) => {
        if (e.data === "app_oauth_completed") {
          // Clear the state from sessionStorage when OAuth is completed
          if (typeof window !== "undefined") {
            sessionStorage.removeItem("goHighLevelOAuthState");
          }

          window.location.reload();
          window.removeEventListener("message", listener);
          popup.close();
        }
      };

      window.addEventListener("message", listener);
    } catch (error) {
      console.error("Error connecting to GoHighLevel:", error);
      toast.error("Failed to connect to GoHighLevel. Please try again.");
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleConnect}
      disabled={isConnecting}
      className="gap-2"
    >
      {isConnecting ? (
        <Icons.Spinner className="h-4 w-4 animate-spin" />
      ) : (
        <Icons.ExternalLink className="h-4 w-4" />
      )}
      {isAddingChannel ? "Configure Channels" : "Connect to GoHighLevel"}
    </Button>
  );
}
