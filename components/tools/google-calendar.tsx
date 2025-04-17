"use client";

import { Icons } from "@/components/icons";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  connectGoogleCalendar,
  disconnectGoogleCalendar,
} from "@/app/actions/tool-credentials";
import { useRouter, useSearchParams } from "next/navigation";

// Interface for serialized tool object
interface SerializableTool {
  id: string;
  name: string;
  description: string;
  type: string;
  integrationType?: string;
  version: string;
  defaultConfig?: Record<string, unknown>;
  functionsMeta: Record<string, { description: string }>;
}

interface GoogleCalendarToolProps {
  tool: SerializableTool;
  botId: string; // Used for API calls when saving configuration
  orgId: string; // Used for redirects after OAuth flows
}

interface Calendar {
  id: string;
  name: string;
  isPrimary?: boolean;
  description?: string;
  backgroundColor?: string;
  foregroundColor?: string;
}

const timeSlotSchema = z.object({
  day: z.enum([
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ]),
  startTime: z.string(),
  endTime: z.string(),
});

const configSchema = z.object({
  appointmentDuration: z.number().min(5).max(240),
  availabilityWindowDays: z.number().min(1).max(90),
  availableTimeSlots: z.array(timeSlotSchema),
  defaultCalendarId: z.string().optional(),
  bufferTimeBetweenMeetings: z.number().min(0).max(60).optional(),
});

export default function GoogleCalendarTool({
  tool,
  botId,
  orgId,
}: GoogleCalendarToolProps) {
  const [activeTab, setActiveTab] = useState("settings");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [selectedCalendar, setSelectedCalendar] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const form = useForm<z.infer<typeof configSchema>>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      appointmentDuration:
        (tool.defaultConfig?.appointmentDuration as number) || 30,
      availabilityWindowDays:
        (tool.defaultConfig?.availabilityWindowDays as number) || 14,
      availableTimeSlots: (tool.defaultConfig?.availableTimeSlots as z.infer<
        typeof timeSlotSchema
      >[]) || [
        { day: "monday", startTime: "09:00", endTime: "17:00" },
        { day: "tuesday", startTime: "09:00", endTime: "17:00" },
        { day: "wednesday", startTime: "09:00", endTime: "17:00" },
        { day: "thursday", startTime: "09:00", endTime: "17:00" },
        { day: "friday", startTime: "09:00", endTime: "17:00" },
      ],
      bufferTimeBetweenMeetings: 0,
    },
  });

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
          `/api/tools/${tool.id}/credentials?provider=google`
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
          // If we have calendars, set them
          if (data.data.calendars && data.data.calendars.length > 0) {
            setCalendars(data.data.calendars);
            // If there's a default calendar, select it
            if (data.data.defaultCalendarId) {
              setSelectedCalendar(data.data.defaultCalendarId);
              form.setValue("defaultCalendarId", data.data.defaultCalendarId);
            }
          }
        } else if (data.exists) {
          // Handle the case where credential exists but no calendars
          setIsConnected(true);
        }
      } catch (error) {
        console.error("Error checking Google connection:", error);
        toast.error("Failed to check Google Calendar connection status");
      } finally {
        setIsLoading(false);
      }
    };

    checkConnection();
  }, [tool.id, searchParams, router, form]);

  async function onSubmit(values: z.infer<typeof configSchema>) {
    try {
      // Save the configuration
      const response = await fetch(
        `/api/bots/${botId}/tools/${tool.id}/config`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to save configuration: ${response.statusText}`);
      }

      toast.success("Configuration saved successfully");
    } catch (error) {
      console.error("Error saving configuration:", error);
      toast.error("Failed to save configuration");
    }
  }

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
        form.setValue("defaultCalendarId", undefined);
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
    form.setValue("defaultCalendarId", calendarId);

    try {
      // Save the selection immediately
      await onSubmit(form.getValues());
    } catch (error) {
      console.error("Error saving calendar selection:", error);
    }
  };

  return (
    <div>
      <Tabs
        defaultValue="settings"
        onValueChange={setActiveTab}
        value={activeTab}
      >
        <TabsList className="mb-6">
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="functions">Functions</TabsTrigger>
          <TabsTrigger value="auth">Authentication</TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Google Calendar Settings</CardTitle>
              <CardDescription>
                Configure how your bot handles calendar appointments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  <FormField
                    control={form.control}
                    name="appointmentDuration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Default Appointment Duration (minutes)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseInt(e.target.value))
                            }
                          />
                        </FormControl>
                        <FormDescription>
                          Default meeting duration when booking appointments
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="availabilityWindowDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Availability Window (days)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseInt(e.target.value))
                            }
                          />
                        </FormControl>
                        <FormDescription>
                          How many days in advance can appointments be booked
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bufferTimeBetweenMeetings"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Buffer Time Between Meetings (minutes)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseInt(e.target.value))
                            }
                          />
                        </FormControl>
                        <FormDescription>
                          Add buffer time between scheduled meetings
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div>
                    <h3 className="text-md font-medium mb-2">
                      Available Time Slots
                    </h3>
                    <div className="space-y-4">
                      {form.watch("availableTimeSlots")?.map((slot, index) => (
                        <div key={index} className="flex items-center gap-4">
                          <FormField
                            control={form.control}
                            name={`availableTimeSlots.${index}.day`}
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select day" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="monday">
                                      Monday
                                    </SelectItem>
                                    <SelectItem value="tuesday">
                                      Tuesday
                                    </SelectItem>
                                    <SelectItem value="wednesday">
                                      Wednesday
                                    </SelectItem>
                                    <SelectItem value="thursday">
                                      Thursday
                                    </SelectItem>
                                    <SelectItem value="friday">
                                      Friday
                                    </SelectItem>
                                    <SelectItem value="saturday">
                                      Saturday
                                    </SelectItem>
                                    <SelectItem value="sunday">
                                      Sunday
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`availableTimeSlots.${index}.startTime`}
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormControl>
                                  <Input type="time" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`availableTimeSlots.${index}.endTime`}
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormControl>
                                  <Input type="time" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button type="submit" className="mt-6">
                    Save Configuration
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="functions">
          <Card>
            <CardHeader>
              <CardTitle>Available Functions</CardTitle>
              <CardDescription>
                Functions this tool provides for your bot to use
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(tool.functionsMeta).map(([name, func]) => (
                  <div key={name} className="space-y-2">
                    <div className="flex items-start space-x-4">
                      <Icons.Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{name}</h3>
                          <div className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            Function
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {func.description}
                        </p>
                      </div>
                    </div>
                    <Separator className="my-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="auth">
          <Card>
            <CardHeader>
              <CardTitle>Google Authentication</CardTitle>
              <CardDescription>
                Connect your Google Calendar account to enable calendar
                functions
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
                      Automatically accept calendar invitations created by the
                      bot
                    </p>
                  </div>
                  <Switch disabled={!isConnected} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
