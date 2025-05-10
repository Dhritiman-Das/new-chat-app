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
        console.log("connected", connected);
        console.log("toolId", toolId);
        if (connected === "true" && toolId === tool.id) {
          setIsConnected(true);
          toast.success("Successfully connected to GoHighLevel");
          // Remove the query params to prevent confusion on page refresh
          const url = new URL(window.location.href);
          url.searchParams.delete("connected");
          url.searchParams.delete("toolId");
          router.replace(url.pathname + url.search);
        }

        // Check for existing connection
        const response = await fetch(
          `/api/tools/${tool.id}/credentials?provider=gohighlevel&botId=${botId}&useNewCredentials=true`
        );

        if (!response.ok) {
          if (response.status !== 404) {
            // Only show error for unexpected failures, not for "not found"
            console.error(
              "Error checking GoHighLevel connection:",
              response.statusText
            );
            toast.error("Failed to check GoHighLevel connection status");
          }
          return;
        }

        const data = await response.json();

        console.log("data", data);

        if (data.success && data.data) {
          setIsConnected(true);

          // Fetch calendars if a credentialId is available
          if (data.data?.credentialId) {
            try {
              // Use the server action instead of direct function call
              const result = await fetchGoHighLevelCalendars({
                credentialId: data.data.credentialId,
              });
              console.log("result", result);
              if (result?.data?.success) {
                setCalendars(result.data.data || []);

                // If there's a default calendar in the bot tool config, select it
                if (data.data.defaultCalendarId) {
                  setSelectedCalendar(data.data.defaultCalendarId);
                }
              } else {
                console.error("Error fetching calendars:", result?.data?.error);
                toast.error(
                  result?.data?.error?.message || "Failed to fetch calendars"
                );
              }
            } catch (calendarError) {
              console.error("Error fetching calendars:", calendarError);
            }
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
  }, [tool.id, searchParams, router]);

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

  // Toggle connection (connect or disconnect based on current state)
  const handleToggleConnection = async () => {
    if (isConnected) {
      setShowDisconnectDialog(true);
    } else {
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
                  {isConnecting ? (
                    <>
                      <Icons.Spinner className="mr-2 h-4 w-4 animate-spin" />
                      {isConnected ? "Disconnecting..." : "Connecting..."}
                    </>
                  ) : isConnected ? (
                    <>
                      <Icons.X className="mr-2 h-4 w-4" />
                      Disconnect Account
                    </>
                  ) : (
                    <>
                      <Icons.Building className="mr-2 h-4 w-4" />
                      Connect Account
                    </>
                  )}
                </Button>
              )}
            </div>

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
                  disabled={!isConnected || calendars.length === 0}
                  value={selectedCalendar || undefined}
                  onValueChange={handleCalendarSelection}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue
                      placeholder={
                        !isConnected
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
    </>
  );
}
