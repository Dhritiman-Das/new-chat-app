"use client";

import { useState, useEffect, useCallback } from "react";
import { Icons } from "@/components/icons";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { SerializableTool, DAYS_OF_WEEK } from "../google-calendar/types";
import { TimeSlotList } from "./time-slot-list";
import TimezoneCombobox from "@/components/timezone-combo-box";

interface CalendarSettingsProps {
  tool: SerializableTool;
  botId: string;
}

const configSchema = z.object({
  appointmentDuration: z.number().min(5).max(240),
  availabilityWindowDays: z.number().min(1).max(90),
  availableTimeSlots: z.array(
    z.object({
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
    })
  ),
  defaultCalendarId: z.string().optional(),
  bufferTimeBetweenMeetings: z.number().min(0).max(60).optional(),
  timeZone: z.string(),
});

export function CalendarSettings({ tool, botId }: CalendarSettingsProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfigLoading, setIsConfigLoading] = useState(false);

  const form = useForm<z.infer<typeof configSchema>>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      appointmentDuration:
        (tool.defaultConfig?.appointmentDuration as number) || 30,
      availabilityWindowDays:
        (tool.defaultConfig?.availabilityWindowDays as number) || 14,
      availableTimeSlots: (tool.defaultConfig?.availableTimeSlots as z.infer<
        typeof configSchema
      >["availableTimeSlots"]) || [
        { day: "monday", startTime: "09:00", endTime: "17:00" },
        { day: "tuesday", startTime: "09:00", endTime: "17:00" },
        { day: "wednesday", startTime: "09:00", endTime: "17:00" },
        { day: "thursday", startTime: "09:00", endTime: "17:00" },
        { day: "friday", startTime: "09:00", endTime: "17:00" },
      ],
      bufferTimeBetweenMeetings: 0,
      timeZone: "America/New_York",
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
          form.setValue("defaultCalendarId", data.config.defaultCalendarId);
        }
      }
    } catch (error) {
      console.error("Error fetching tool config:", error);
      // We don't show an error toast here to avoid confusion
      // Just use the default values from the form
    } finally {
      setIsConfigLoading(false);
      setIsLoading(false);
    }
  }, [botId, tool.id, form]);

  // Fetch config on mount
  useEffect(() => {
    fetchToolConfig();
  }, [fetchToolConfig]);

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>GoHighLevel Calendar Settings</CardTitle>
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                        All appointments will use this timezone by default.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <TimeSlotList form={form} daysOfWeek={DAYS_OF_WEEK} />

              <Button type="submit" disabled={isSaving} className="mt-6">
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
  );
}
