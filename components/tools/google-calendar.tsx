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
import { useState, useEffect, useCallback } from "react";
import { useQueryState } from "nuqs";
import { toast } from "sonner";
import {
  connectGoogleCalendar,
  disconnectGoogleCalendar,
  getCalendarsForCredential,
} from "@/app/actions/tool-credentials";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import Link from "next/link";
import { AppointmentsTab } from "./google-calendar/appointments-tab";
import { Appointment } from "./google-calendar/types";
import { googleCalendarTimezones } from "@/lib/google-calendar-timezones";
import * as React from "react";
import { ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
  moreDetailsDialog?: React.ReactNode;
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
  timeZone: z.string(),
});

const DAYS_OF_WEEK = [
  { id: "monday", label: "Monday" },
  { id: "tuesday", label: "Tuesday" },
  { id: "wednesday", label: "Wednesday" },
  { id: "thursday", label: "Thursday" },
  { id: "friday", label: "Friday" },
  { id: "saturday", label: "Saturday" },
  { id: "sunday", label: "Sunday" },
];

interface TimezoneComboboxProps {
  value: string;
  onChange: (value: string) => void;
}

function TimezoneCombobox({ value, onChange }: TimezoneComboboxProps) {
  const [open, setOpen] = React.useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {value ? value : "Select timezone..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command>
          <CommandInput placeholder="Search timezone..." className="h-9" />
          <CommandList>
            <CommandEmpty>No timezone found.</CommandEmpty>
            <CommandGroup>
              {googleCalendarTimezones.map((tz) => (
                <CommandItem
                  key={tz}
                  value={tz}
                  onSelect={(currentValue) => {
                    onChange(currentValue);
                    setOpen(false);
                  }}
                >
                  {tz}
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      value === tz ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function GoogleCalendarTool({
  tool,
  botId,
  orgId,
}: GoogleCalendarToolProps) {
  const [activeTab, setActiveTab] = useQueryState("tab", {
    defaultValue: "settings",
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfigLoading, setIsConfigLoading] = useState(false);
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [selectedCalendar, setSelectedCalendar] = useState<string | null>(null);
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [isAppointmentDetailsOpen, setIsAppointmentDetailsOpen] =
    useState(false);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
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
      timeZone:
        typeof tool.defaultConfig?.timeZone === "string" &&
        tool.defaultConfig.timeZone
          ? (tool.defaultConfig.timeZone as string)
          : "America/New_York",
    },
  });

  // Fetch bot tool config
  const fetchToolConfig = useCallback(async () => {
    try {
      setIsConfigLoading(true);
      const response = await fetch(
        `/api/bots/${botId}/tools/${tool.id}/config`
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch tool config: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.config) {
        // Update the form with existing config values
        if (data.config.appointmentDuration) {
          form.setValue("appointmentDuration", data.config.appointmentDuration);
        }

        if (data.config.availabilityWindowDays) {
          form.setValue(
            "availabilityWindowDays",
            data.config.availabilityWindowDays
          );
        }

        if (data.config.bufferTimeBetweenMeetings !== undefined) {
          form.setValue(
            "bufferTimeBetweenMeetings",
            data.config.bufferTimeBetweenMeetings
          );
        }

        if (
          data.config.availableTimeSlots &&
          Array.isArray(data.config.availableTimeSlots)
        ) {
          form.setValue("availableTimeSlots", data.config.availableTimeSlots);
        }

        if (data.config.defaultCalendarId) {
          setSelectedCalendar(data.config.defaultCalendarId);
          form.setValue("defaultCalendarId", data.config.defaultCalendarId);
        }

        if (data.config.timeZone && typeof data.config.timeZone === "string") {
          form.setValue("timeZone", data.config.timeZone);
        } else {
          form.setValue("timeZone", "America/New_York");
        }
      }
    } catch (error) {
      console.error("Error fetching tool config:", error);
      // We don't show an error toast here to avoid confusion
      // Just use the default values from the form
    } finally {
      setIsConfigLoading(false);
    }
  }, [botId, tool.id, form, setSelectedCalendar]);

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
          `/api/tools/${tool.id}/credentials?provider=google&botId=${botId}&useNewCredentials=true`
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
                  form.setValue(
                    "defaultCalendarId",
                    data.data.defaultCalendarId
                  );
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

          // Also fetch the current bot tool config for this tool
          fetchToolConfig();
        }
      } catch (error) {
        console.error("Error checking Google connection:", error);
        toast.error("Failed to check Google Calendar connection status");
      } finally {
        setIsLoading(false);
      }
    };

    checkConnection();
  }, [tool.id, searchParams, router, form, fetchToolConfig]);

  // Function to open appointment details dialog
  const openAppointmentDetails = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsAppointmentDetailsOpen(true);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Format time for display
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  async function onSubmit(values: z.infer<typeof configSchema>) {
    try {
      setIsSaving(true);
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
    } finally {
      setIsSaving(false);
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
      setShowDisconnectDialog(false);
    }
  };

  // Toggle connection (connect or disconnect based on current state)
  const handleToggleConnection = async () => {
    if (isConnected) {
      setShowDisconnectDialog(true);
    } else {
      await handleConnectGoogleCalendar();
    }
  };

  // Handle calendar selection
  const handleCalendarSelection = async (calendarId: string) => {
    setSelectedCalendar(calendarId);

    // Update the form value
    form.setValue("defaultCalendarId", calendarId);

    try {
      // Get the current form values
      const values = form.getValues();

      // Submit the form with the updated calendar ID
      await onSubmit({
        ...values,
        defaultCalendarId: calendarId,
      });
    } catch (error) {
      console.error("Error saving calendar selection:", error);
    }
  };

  return (
    <>
      {/* Conditional Alert based on connection and configuration status */}
      {!isConnected ? (
        <Alert className="mb-8" variant="destructive">
          <Icons.Info className="h-4 w-4" />
          <AlertTitle>Authentication Required</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>
              You need to connect your Google Calendar account to use this tool.
              Please authenticate your account to get started.
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleConnectGoogleCalendar}
              disabled={isConnecting}
              className="ml-4 shrink-0"
            >
              {isConnecting ? (
                <>
                  <Icons.Spinner className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Icons.Calendar className="mr-2 h-4 w-4" />
                  Connect Account
                </>
              )}
            </Button>
          </AlertDescription>
        </Alert>
      ) : !selectedCalendar ? (
        <Alert className="mb-8" variant="default">
          <Icons.Warning className="h-4 w-4" />
          <AlertTitle>Configuration Required</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>
              You&apos;re connected to Google Calendar but haven&apos;t selected
              a default calendar. Please choose a default calendar to complete
              the setup.
            </span>
            <div className="ml-4 shrink-0">
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
            </div>
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="mb-8">
          <Icons.CheckCircle className="h-4 w-4" />
          <AlertTitle>Ready to Use</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>
              Google Calendar is connected and configured. Your bot can now
              manage calendar appointments and check availability.
            </span>
          </AlertDescription>
        </Alert>
      )}
      <div>
        <Tabs
          defaultValue="settings"
          onValueChange={setActiveTab}
          value={activeTab}
        >
          <TabsList className="mb-6">
            <TabsTrigger value="settings" className="w-[150px]">
              Settings
            </TabsTrigger>
            <TabsTrigger value="functions" className="w-[150px]">
              Functions
            </TabsTrigger>
            <TabsTrigger value="auth" className="w-[150px]">
              Authentication
            </TabsTrigger>
            <TabsTrigger value="appointments" className="w-[150px]">
              Appointments
            </TabsTrigger>
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
                {isConfigLoading || isLoading ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Icons.Spinner className="h-8 w-8 animate-spin text-primary mb-4" />
                    <p className="text-sm text-muted-foreground">
                      Loading configuration...
                    </p>
                  </div>
                ) : (
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(onSubmit)}
                      className="space-y-6"
                    >
                      {/* First row: Appointment Duration & Availability Window */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                Default meeting duration when booking
                                appointments
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
                                How many days in advance can appointments be
                                booked
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Second row: Buffer Time & Timezone */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                        <FormField
                          control={form.control}
                          name="timeZone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Timezone</FormLabel>
                              <FormControl>
                                <TimezoneCombobox
                                  value={field.value}
                                  onChange={field.onChange}
                                />
                              </FormControl>
                              <FormDescription>
                                All appointments will use this timezone by
                                default.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div>
                        <h3 className="text-md font-medium mb-2">
                          Available Time Slots
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Select which days you are available for appointments
                          and set your available hours
                        </p>

                        <div className="space-y-6 mb-4">
                          <div className="flex flex-wrap gap-2 mb-4">
                            {DAYS_OF_WEEK.map((day) => {
                              const isSelected = form
                                .watch("availableTimeSlots")
                                ?.some((slot) => slot.day === day.id);

                              return (
                                <Button
                                  key={day.id}
                                  type="button"
                                  variant={isSelected ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => {
                                    const currentSlots =
                                      form.watch("availableTimeSlots") || [];

                                    if (isSelected) {
                                      // Remove this day
                                      form.setValue(
                                        "availableTimeSlots",
                                        currentSlots.filter(
                                          (slot) => slot.day !== day.id
                                        )
                                      );
                                    } else {
                                      // Add this day with default 9-5 hours
                                      form.setValue("availableTimeSlots", [
                                        ...currentSlots,
                                        {
                                          day: day.id as z.infer<
                                            typeof timeSlotSchema
                                          >["day"],
                                          startTime: "09:00",
                                          endTime: "17:00",
                                        },
                                      ]);
                                    }
                                  }}
                                  className="flex items-center gap-2"
                                >
                                  {isSelected ? (
                                    <Icons.Check className="h-4 w-4" />
                                  ) : (
                                    <Icons.Add className="h-4 w-4" />
                                  )}
                                  <span>{day.label}</span>
                                </Button>
                              );
                            })}
                          </div>

                          {form.watch("availableTimeSlots")?.length === 0 && (
                            <div className="p-4 border border-dashed rounded-md flex items-center justify-center">
                              <p className="text-sm text-muted-foreground">
                                Select at least one day to set your availability
                              </p>
                            </div>
                          )}

                          {form
                            .watch("availableTimeSlots")
                            ?.sort((a, b) => {
                              const dayOrder =
                                DAYS_OF_WEEK.findIndex((d) => d.id === a.day) -
                                DAYS_OF_WEEK.findIndex((d) => d.id === b.day);
                              return dayOrder;
                            })
                            .map((slot, index) => {
                              const dayObj = DAYS_OF_WEEK.find(
                                (d) => d.id === slot.day
                              );

                              return (
                                <div
                                  key={`${slot.day}-${index}`}
                                  className="p-4 border rounded-md"
                                >
                                  <div className="flex items-center justify-between mb-4">
                                    <h4 className="font-medium">
                                      {dayObj?.label}
                                    </h4>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        const currentSlots =
                                          form.watch("availableTimeSlots");
                                        form.setValue(
                                          "availableTimeSlots",
                                          currentSlots.filter((_, i) => {
                                            const slotToRemove =
                                              currentSlots[index];
                                            return !(
                                              slotToRemove.day === slot.day &&
                                              i === index
                                            );
                                          })
                                        );
                                      }}
                                      className="h-8 w-8 p-0 text-destructive"
                                    >
                                      <Icons.Trash className="h-4 w-4" />
                                      <span className="sr-only">Remove</span>
                                    </Button>
                                  </div>

                                  <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                      control={form.control}
                                      name={`availableTimeSlots.${index}.startTime`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Start Time</FormLabel>
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
                                        <FormItem>
                                          <FormLabel>End Time</FormLabel>
                                          <FormControl>
                                            <Input type="time" {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>

                      <Button
                        type="submit"
                        disabled={isSaving}
                        className="mt-6"
                      >
                        {isSaving ? (
                          <>
                            <Icons.Spinner className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          "Save Configuration"
                        )}
                      </Button>
                    </form>
                  </Form>
                )}
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

                  {/* Disconnect Confirmation Dialog */}
                  <Dialog
                    open={showDisconnectDialog}
                    onOpenChange={setShowDisconnectDialog}
                  >
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Disconnect Google Calendar?</DialogTitle>
                        <DialogDescription>
                          Are you sure you want to disconnect Google Calendar?
                          This will remove access to all calendars.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button
                          variant="destructive"
                          onClick={handleDisconnectGoogleCalendar}
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

          <TabsContent value="appointments">
            <AppointmentsTab
              botId={botId}
              openAppointmentDetails={openAppointmentDetails}
              activeTab={activeTab}
            />
          </TabsContent>
        </Tabs>

        {/* Appointment Details Dialog */}
        <Dialog
          open={isAppointmentDetailsOpen}
          onOpenChange={setIsAppointmentDetailsOpen}
        >
          <DialogContent className="lg:max-w-screen-md overflow-y-scroll max-h-screen">
            <DialogHeader>
              <DialogTitle>Appointment Details</DialogTitle>
              <DialogDescription>
                Details for the selected appointment
              </DialogDescription>
            </DialogHeader>
            {selectedAppointment && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-1 gap-2">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Title</p>
                    <p className="text-base">
                      {selectedAppointment.title || "Untitled Appointment"}
                    </p>
                  </div>

                  {selectedAppointment.description && (
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Description</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {selectedAppointment.description}
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Date</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(selectedAppointment.startTime)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Status</p>
                    <Badge
                      variant={
                        selectedAppointment.status === "cancelled"
                          ? "destructive"
                          : selectedAppointment.status === "confirmed"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {selectedAppointment.status || "confirmed"}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Start Time</p>
                    <p className="text-sm text-muted-foreground">
                      {formatTime(selectedAppointment.startTime)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">End Time</p>
                    <p className="text-sm text-muted-foreground">
                      {formatTime(selectedAppointment.endTime)}
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium">Timezone</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedAppointment.timeZone || "UTC"}
                  </p>
                </div>

                {selectedAppointment.location && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Location</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedAppointment.location}
                    </p>
                  </div>
                )}

                {selectedAppointment.attendees &&
                  selectedAppointment.attendees.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Attendees</p>
                      <div className="space-y-1">
                        {selectedAppointment.attendees.map(
                          (attendee, index) => (
                            <div
                              key={index}
                              className="text-sm text-muted-foreground"
                            >
                              {attendee.name
                                ? `${attendee.name} (${attendee.email})`
                                : attendee.email}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                {selectedAppointment.meetingLink && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Meeting Link</p>
                    <a
                      href={selectedAppointment.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary underline"
                    >
                      {selectedAppointment.meetingLink}
                    </a>
                  </div>
                )}

                {selectedAppointment.conversationId && (
                  <div className="mt-2">
                    <Link
                      href={`/dashboard/${orgId}/bots/${botId}/conversations/${selectedAppointment.conversationId}`}
                      target="_blank"
                      className="flex items-center hover:underline text-sm"
                    >
                      Check conversation
                      <Icons.ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </div>
                )}

                {/* Properties */}
                {selectedAppointment.properties &&
                  Object.keys(selectedAppointment.properties).length > 0 && (
                    <>
                      <Separator className="my-2" />
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold">Properties</h4>
                        <div className="grid grid-cols-2 gap-4">
                          {Object.entries(selectedAppointment.properties).map(
                            ([key, value]) => (
                              <div key={key} className="space-y-1">
                                <p className="text-sm font-medium capitalize">
                                  {key}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {value === null || value === undefined
                                    ? "—"
                                    : typeof value === "object"
                                    ? JSON.stringify(value)
                                    : String(value)}
                                </p>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    </>
                  )}

                {/* Metadata */}
                {selectedAppointment.metadata &&
                  Object.keys(selectedAppointment.metadata).length > 0 && (
                    <>
                      <Separator className="my-2" />
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold">Metadata</h4>
                        <pre className="bg-secondary/50 p-4 rounded-md overflow-auto text-xs">
                          {JSON.stringify(
                            selectedAppointment.metadata,
                            null,
                            2
                          )}
                        </pre>
                      </div>
                    </>
                  )}
              </div>
            )}
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
