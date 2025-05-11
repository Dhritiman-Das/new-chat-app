"use client";

import { useState, useEffect } from "react";
import { Icons } from "@/components/icons";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import {
  connectGoHighLevel,
  disconnectGoHighLevel,
} from "@/app/actions/tool-credentials";
import { fetchGoHighLevelCalendars } from "@/app/actions/gohighlevel";
import {
  getProviderCredentials,
  getToolCredentials,
  removeCredential,
  reconnectToolCredential,
} from "@/app/actions/credentials";
import { Calendar, SerializableTool } from "./types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

// Define a Credential type
interface Credential {
  id: string;
  provider: string;
  name: string;
  botId?: string;
  credentials: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface AuthenticationTabProps {
  tool: SerializableTool;
  botId: string;
  orgId: string;
}

export function AuthenticationTab({
  tool,
  botId,
  orgId,
}: AuthenticationTabProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [selectedCalendar, setSelectedCalendar] = useState<string | null>(null);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [showRemoveCredentialDialog, setShowRemoveCredentialDialog] =
    useState(false);
  const [providerCredential, setProviderCredential] =
    useState<Credential | null>(null);
  const [toolHasCredential, setToolHasCredential] = useState(false);
  const [credentialId, setCredentialId] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Check if user already has GoHighLevel connected
  useEffect(() => {
    const checkConnection = async () => {
      try {
        setIsLoading(true);
        // Check if we just returned from OAuth flow
        const connected = searchParams.get("connected");
        const toolId = searchParams.get("toolId");

        if (connected === "true" && toolId === tool.id) {
          setIsConnected(true);
          setToolHasCredential(true);
          toast.success("Successfully connected to GoHighLevel");
          // Remove the query params to prevent confusion on page refresh
          const url = new URL(window.location.href);
          url.searchParams.delete("connected");
          url.searchParams.delete("toolId");
          router.replace(url.pathname + url.search);
        }

        // Step 1: Check if the tool has credentials
        const toolResponse = await getToolCredentials({
          toolId: tool.id,
          botId,
        });

        let toolCredential = null;
        if (toolResponse?.data?.success && toolResponse.data.data?.credential) {
          toolCredential = toolResponse.data.data.credential;
          const toolData = toolResponse.data.data.botTool;
          setToolHasCredential(true);
          setIsConnected(true);
          setCredentialId(toolCredential.id);

          // Only fetch calendars if the tool has a credential
          if (toolCredential.id) {
            try {
              const result = await fetchGoHighLevelCalendars({
                credentialId: toolCredential.id,
              });

              if (result?.data?.success) {
                setCalendars(result.data.data || []);

                // If there's a default calendar in the bot tool config, select it
                if (
                  toolData?.config &&
                  typeof toolData.config === "object" &&
                  "defaultCalendarId" in toolData.config
                ) {
                  setSelectedCalendar(
                    toolData.config.defaultCalendarId as string
                  );
                }
              } else {
                console.error("Error fetching calendars:", result?.data?.error);
              }
            } catch (calendarError) {
              console.error("Error fetching calendars:", calendarError);
            }
          }
        }

        // Step 2: If no tool credentials, check if the provider has credentials for that bot
        if (!toolCredential) {
          const providerResponse = await getProviderCredentials({
            provider: "gohighlevel",
            botId,
          });

          if (providerResponse?.data?.success && providerResponse.data.data) {
            const credentialData = providerResponse.data.data as Credential;
            setProviderCredential(credentialData);
            setCredentialId(credentialData.id);
            // We found provider credentials, but they're not linked to this tool
          }
        }
      } catch (error) {
        console.error("Error checking GoHighLevel connection:", error);
        toast.error("Failed to check GoHighLevel connection status");
      } finally {
        setIsLoading(false);
      }
    };

    checkConnection();
  }, [tool.id, botId, searchParams, router]);

  // Handle connecting to GoHighLevel
  const handleConnectGoHighLevel = async () => {
    setIsConnecting(true);
    try {
      const response = await connectGoHighLevel({
        toolId: tool.id,
        botId,
        orgId,
      });

      // Check if the response has a success flag and authUrl
      if (response?.data?.success && response.data?.data?.authUrl) {
        window.location.href = response.data.data.authUrl;
      } else {
        toast.error(
          response?.data?.error?.message || "Failed to connect to GoHighLevel"
        );
      }
    } catch (error) {
      console.error("Error connecting to GoHighLevel:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsConnecting(false);
    }
  };

  // Handle disconnecting GoHighLevel
  const handleDisconnectGoHighLevel = async () => {
    setIsConnecting(true);
    try {
      const result = await disconnectGoHighLevel({
        toolId: tool.id,
      });

      if (result && result.data && result.data.success) {
        // Reset states
        setIsConnected(false);
        setToolHasCredential(false);
        setCalendars([]);
        setSelectedCalendar(null);
        toast.success("Successfully disconnected from GoHighLevel");
      } else {
        toast.error("Failed to disconnect from GoHighLevel");
      }
    } catch (error) {
      console.error("Error disconnecting from GoHighLevel:", error);
      toast.error("Failed to disconnect from GoHighLevel");
    } finally {
      setIsConnecting(false);
      setShowDisconnectDialog(false);
    }
  };

  // Handle removing credential from database
  const handleRemoveCredential = async () => {
    if (!credentialId) return;

    setIsConnecting(true);
    try {
      const response = await removeCredential({
        credentialId,
      });

      if (response?.data?.success) {
        setProviderCredential(null);
        setCredentialId(null);
        toast.success("Successfully removed GoHighLevel credential");
      } else {
        toast.error("Failed to remove GoHighLevel credential");
      }
    } catch (error) {
      console.error("Error removing GoHighLevel credential:", error);
      toast.error("Failed to remove GoHighLevel credential");
    } finally {
      setIsConnecting(false);
      setShowRemoveCredentialDialog(false);
    }
  };

  // Handle reconnecting a credential to the tool
  const handleReconnectCredential = async () => {
    if (!providerCredential) return;

    setIsConnecting(true);
    try {
      const response = await reconnectToolCredential({
        toolId: tool.id,
        botId,
        provider: "gohighlevel",
      });

      if (response?.data?.success) {
        setToolHasCredential(true);
        setIsConnected(true);

        // Refresh the page to update the UI with the reconnected credential
        window.location.reload();

        toast.success("Successfully reconnected GoHighLevel account");
      } else {
        toast.error("Failed to reconnect GoHighLevel account");
      }
    } catch (error) {
      console.error("Error reconnecting GoHighLevel account:", error);
      toast.error("Failed to reconnect GoHighLevel account");
    } finally {
      setIsConnecting(false);
    }
  };

  // Toggle connection (connect or disconnect based on current state)
  const handleToggleConnection = async () => {
    if (isConnected) {
      setShowDisconnectDialog(true);
    } else if (providerCredential) {
      // If there is an existing provider credential, use reconnect
      await handleReconnectCredential();
    } else {
      // Otherwise go through normal connection flow
      await handleConnectGoHighLevel();
    }
  };

  // Handle location selection
  const handleCalendarSelection = async (calendarId: string) => {
    setSelectedCalendar(calendarId);

    try {
      // Save the calendar selection
      const response = await fetch(
        `/api/bots/${botId}/tools/${tool.id}/config`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ defaultCalendarId: calendarId }),
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to save calendar selection: ${response.statusText}`
        );
      }

      toast.success("Default calendar updated successfully");
    } catch (error) {
      console.error("Error saving calendar selection:", error);
      toast.error("Failed to update default calendar");
    }
  };

  const getConnectionButtonContent = () => {
    if (isConnecting) {
      return (
        <>
          <Icons.Spinner className="mr-2 h-4 w-4 animate-spin" />
          {isConnected ? "Disconnecting..." : "Connecting..."}
        </>
      );
    }

    if (isConnected) {
      return (
        <>
          <Icons.X className="mr-2 h-4 w-4" />
          Disconnect Account
        </>
      );
    }

    if (providerCredential) {
      return (
        <>
          <Icons.RefreshCw className="mr-2 h-4 w-4" />
          Reconnect Existing Account
        </>
      );
    }

    return (
      <>
        <Icons.Building className="mr-2 h-4 w-4" />
        Connect Account
      </>
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>GoHighLevel Authentication</CardTitle>
          <CardDescription>
            Connect your GoHighLevel account to enable CRM integration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Connect GoHighLevel Account</h3>
                <p className="text-sm text-muted-foreground">
                  Grant permissions to manage your CRM data and conversations
                </p>
              </div>
              {isLoading ? (
                <Button variant="outline" disabled>
                  <Icons.Spinner className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    onClick={handleToggleConnection}
                    disabled={isConnecting}
                    variant={isConnected ? "outline" : "default"}
                    className={
                      isConnected
                        ? "text-destructive border-destructive hover:bg-destructive/10"
                        : ""
                    }
                  >
                    {getConnectionButtonContent()}
                  </Button>

                  {providerCredential && !isConnected && (
                    <Button
                      variant="outline"
                      className="text-destructive border-destructive hover:bg-destructive/10"
                      onClick={() => setShowRemoveCredentialDialog(true)}
                      disabled={isConnecting}
                    >
                      <Icons.Trash className="mr-2 h-4 w-4" />
                      Remove
                    </Button>
                  )}
                </div>
              )}
            </div>

            {providerCredential && !toolHasCredential && (
              <div className="flex items-center p-3 text-sm bg-amber-50 border border-amber-200 rounded-md">
                <Icons.Info className="w-4 h-4 text-amber-500 mr-2 flex-shrink-0" />
                <p className="text-amber-700">
                  A GoHighLevel connection exists for this bot but is not linked
                  to this tool. You can reconnect to link it or remove it
                  completely.
                </p>
              </div>
            )}

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Default Calendar</h3>
                <p className="text-sm text-muted-foreground">
                  Select a default calendar
                </p>
              </div>
              {isLoading ? (
                <div className="w-[200px] h-10 flex items-center justify-center">
                  <Icons.Spinner className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Select
                  disabled={!toolHasCredential || calendars.length === 0}
                  value={selectedCalendar || undefined}
                  onValueChange={handleCalendarSelection}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue
                      placeholder={
                        !toolHasCredential
                          ? "Connect account first"
                          : calendars.length === 0
                          ? "No calendars available"
                          : "Select a calendar"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {calendars.map((calendar) => (
                      <SelectItem
                        key={calendar.id}
                        value={calendar.id}
                        className="flex items-center"
                      >
                        <span>
                          {calendar.name}
                          {calendar.isPrimary && " (Primary)"}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Disconnect Confirmation Dialog */}
      <Dialog
        open={showDisconnectDialog}
        onOpenChange={setShowDisconnectDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect GoHighLevel?</DialogTitle>
            <DialogDescription>
              Are you sure you want to disconnect GoHighLevel? This will remove
              access to all CRM data and conversations.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={handleDisconnectGoHighLevel}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <Icons.Spinner className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Disconnect
            </Button>
            <DialogClose asChild>
              <Button variant="outline" disabled={isConnecting}>
                Cancel
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Credential Confirmation Dialog */}
      <Dialog
        open={showRemoveCredentialDialog}
        onOpenChange={setShowRemoveCredentialDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove GoHighLevel Credential?</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this GoHighLevel credential from
              the database? This will remove the credential completely from your
              bot.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={handleRemoveCredential}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <Icons.Spinner className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Remove Credential
            </Button>
            <DialogClose asChild>
              <Button variant="outline" disabled={isConnecting}>
                Cancel
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
