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
import { Switch } from "@/components/ui/switch";
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
  connectGoogleCalendar,
  disconnectGoogleCalendar,
  getCalendarsForCredential,
} from "@/app/actions/tool-credentials";
import { Calendar, SerializableTool } from "./types";

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
  const router = useRouter();
  const searchParams = useSearchParams();

  // Check if user already has Google Calendar connected
  useEffect(() => {
    const checkConnection = async () => {
      try {
        setIsLoading(true);
        // Check if we just returned from OAuth flow
        const connected = searchParams.get("connected");
        const toolId = searchParams.get("toolId");

        if (connected === "true" && toolId === tool.id) {
          setIsConnected(true);
          toast.success("Successfully connected to Google Calendar");
          // Remove the query params to prevent confusion on page refresh
          const url = new URL(window.location.href);
          url.searchParams.delete("connected");
          url.searchParams.delete("toolId");
          router.replace(url.pathname + url.search);
        }

        // Check for existing connection
        const response = await fetch(
          `/api/tools/${tool.id}/credentials?provider=google&useNewCredentials=true`
        );
        if (!response.ok) {
          if (response.status !== 404) {
            // Only show error for unexpected failures, not for "not found"
            console.error(
              "Error checking Google connection:",
              response.statusText
            );
            toast.error("Failed to check Google Calendar connection status");
          }
          return;
        }

        const data = await response.json();

        if (data.success && data.data) {
          setIsConnected(true);

          // Fetch calendars if a credentialId is available
          if (data.data?.credentialId) {
            try {
              // Use the server action instead of fetch
              const calendarResult = await getCalendarsForCredential({
                credentialId: data.data.credentialId,
              });

              if (calendarResult?.data?.success && calendarResult?.data?.data) {
                // Type assertion to help TypeScript understand this is a Calendar array
                const calendars = calendarResult.data.data as Calendar[];
                setCalendars(calendars);

                // If there's a default calendar in the bot tool config, select it
                if (data.data.defaultCalendarId) {
                  setSelectedCalendar(data.data.defaultCalendarId);
                }
              } else if (calendarResult?.data?.error) {
                console.error(
                  "Error fetching calendars:",
                  calendarResult.data.error
                );
                toast.error(calendarResult.data.error.message);
              }
            } catch (calError) {
              console.error("Error fetching calendars:", calError);
            }
          }
        }
      } catch (error) {
        console.error("Error checking Google connection:", error);
        toast.error("Failed to check Google Calendar connection status");
      } finally {
        setIsLoading(false);
      }
    };

    checkConnection();
  }, [tool.id, searchParams, router]);

  // Handle connecting to Google Calendar
  const handleConnectGoogleCalendar = async () => {
    setIsConnecting(true);
    try {
      const response = await connectGoogleCalendar({
        toolId: tool.id,
        botId,
        orgId,
      });

      // Check if the response has a success flag and authUrl
      if (response?.data?.success && response.data?.data?.authUrl) {
        window.location.href = response.data.data.authUrl;
      } else {
        toast.error(
          response?.data?.error?.message ||
            "Failed to connect to Google Calendar"
        );
      }
    } catch (error) {
      console.error("Error connecting to Google Calendar:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsConnecting(false);
    }
  };

  // Handle disconnecting Google Calendar
  const handleDisconnectGoogleCalendar = async () => {
    if (
      !confirm(
        "Are you sure you want to disconnect Google Calendar? This will remove access to all calendars."
      )
    ) {
      return;
    }

    setIsConnecting(true);
    try {
      const result = await disconnectGoogleCalendar({
        toolId: tool.id,
      });

      if (result && result.data && result.data.success) {
        // Reset states
        setIsConnected(false);
        setCalendars([]);
        setSelectedCalendar(null);
        toast.success("Successfully disconnected from Google Calendar");
      } else {
        toast.error("Failed to disconnect from Google Calendar");
      }
    } catch (error) {
      console.error("Error disconnecting from Google Calendar:", error);
      toast.error("Failed to disconnect from Google Calendar");
    } finally {
      setIsConnecting(false);
    }
  };

  // Toggle connection (connect or disconnect based on current state)
  const handleToggleConnection = async () => {
    if (isConnected) {
      await handleDisconnectGoogleCalendar();
    } else {
      await handleConnectGoogleCalendar();
    }
  };

  // Handle calendar selection
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
    <Card>
      <CardHeader>
        <CardTitle>Google Authentication</CardTitle>
        <CardDescription>
          Connect your Google Calendar account to enable calendar functions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Connect Google Account</h3>
              <p className="text-sm text-muted-foreground">
                Grant permissions to manage your calendars
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
                    <Icons.Calendar className="mr-2 h-4 w-4" />
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
                Select a default calendar for appointments
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
                      <div className="flex items-center gap-2">
                        {calendar.backgroundColor && (
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor: calendar.backgroundColor,
                            }}
                          ></div>
                        )}
                        <span>
                          {calendar.name}
                          {calendar.isPrimary && " (Primary)"}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Auto-Accept Invitations</h3>
              <p className="text-sm text-muted-foreground">
                Automatically accept calendar invitations created by the bot
              </p>
            </div>
            <Switch disabled={!isConnected} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
