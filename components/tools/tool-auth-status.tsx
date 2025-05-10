"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { toast } from "sonner";
import { AuthRequirement } from "@/lib/tools/definitions/tool-interface";
import { useRouter } from "next/navigation";
import {
  connectGoogleCalendar,
  disconnectGoogleCalendar,
} from "@/app/actions/tool-credentials";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

interface ToolAuthStatusProps {
  toolId: string;
  botId: string;
  orgId: string;
  authRequirement?: AuthRequirement;
}

// Inner component to handle auth status - prevents conditional hook issues
function AuthStatusContent({
  toolId,
  botId,
  orgId,
  authRequirement,
}: ToolAuthStatusProps) {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isActionInProgress, setIsActionInProgress] = useState<boolean>(false);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const router = useRouter();
  const provider = authRequirement?.provider || "service";

  // Check authentication status
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(
          `/api/tools/${toolId}/credentials?provider=${provider}&botId=${botId}&useNewCredentials=true`
        );

        if (response.ok) {
          const data = await response.json();
          setIsConnected(data.success && data.exists);
        } else {
          setIsConnected(false);
        }
      } catch (error) {
        console.error(`Error checking auth status:`, error);
        setIsConnected(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, [toolId, provider]);

  // Handle connecting to service
  const handleConnect = async () => {
    try {
      setIsActionInProgress(true);

      if (provider === "google") {
        const result = await connectGoogleCalendar({
          toolId,
          botId,
          orgId,
        });

        if (result?.data?.success && result.data?.data?.authUrl) {
          window.location.href = result.data.data.authUrl;
          return;
        } else if (result?.data?.error) {
          toast.error(result.data.error.message || "Connection failed");
        } else {
          toast.error(`Failed to connect to ${provider}`);
        }
      } else if (authRequirement?.authUrl) {
        window.location.href = authRequirement.authUrl;
        return;
      } else {
        toast.error("Connection not available for this tool");
      }
    } catch (error) {
      console.error(`Error connecting:`, error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsActionInProgress(false);
    }
  };

  // Handle disconnecting from service
  const handleDisconnect = async () => {
    setIsActionInProgress(true);
    try {
      if (provider === "google") {
        const result = await disconnectGoogleCalendar({
          toolId,
        });

        if (result?.data?.success) {
          setIsConnected(false);
          toast.success(`Successfully disconnected`);
          // Refresh the page to update UI
          router.refresh();
        } else if (result?.data?.error) {
          toast.error(result.data.error.message || "Disconnection failed");
        } else {
          toast.error(`Failed to disconnect`);
        }
      } else {
        toast.error("Disconnect function not available for this tool");
      }
    } catch (error) {
      console.error(`Error disconnecting:`, error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsActionInProgress(false);
      setShowDisconnectDialog(false);
    }
  };

  if (isLoading) {
    return (
      <Button variant="outline" disabled>
        <Icons.Spinner className="mr-2 h-4 w-4 animate-spin" />
        Checking connection...
      </Button>
    );
  }

  if (isConnected) {
    return (
      <>
        <Button
          variant="outline"
          onClick={() => setShowDisconnectDialog(true)}
          disabled={isActionInProgress}
          className="text-destructive border-destructive hover:bg-destructive/10"
        >
          {isActionInProgress ? (
            <>
              <Icons.Spinner className="mr-2 h-4 w-4 animate-spin" />
              Disconnecting...
            </>
          ) : (
            <>
              <Icons.X className="mr-2 h-4 w-4" />
              Disconnect
            </>
          )}
        </Button>
        <Dialog
          open={showDisconnectDialog}
          onOpenChange={setShowDisconnectDialog}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Disconnect from {provider}?</DialogTitle>
              <DialogDescription>
                Are you sure you want to disconnect from {provider}?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="destructive"
                onClick={handleDisconnect}
                disabled={isActionInProgress}
              >
                {isActionInProgress ? (
                  <Icons.Spinner className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Disconnect
              </Button>
              <DialogClose asChild>
                <Button variant="outline" disabled={isActionInProgress}>
                  Cancel
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <Button onClick={handleConnect} disabled={isActionInProgress}>
      {isActionInProgress ? (
        <>
          <Icons.Spinner className="mr-2 h-4 w-4 animate-spin" />
          Connecting...
        </>
      ) : (
        <>Connect</>
      )}
    </Button>
  );
}

/**
 * Component to handle tool authentication status and display connect/disconnect buttons
 */
export function ToolAuthStatus(props: ToolAuthStatusProps) {
  // Early return if auth not required
  if (!props.authRequirement?.required) {
    return null;
  }

  // Render the inner component otherwise
  return <AuthStatusContent {...props} />;
}
