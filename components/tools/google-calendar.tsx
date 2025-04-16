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
import { useState } from "react";

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
}: GoogleCalendarToolProps) {
  const [activeTab, setActiveTab] = useState("settings");

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

  function onSubmit(values: z.infer<typeof configSchema>) {
    // TODO: Implement save configuration using botId for API calls
    console.log(values, botId);
  }

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
                  <Button variant="outline">
                    <Icons.Calendar className="mr-2 h-4 w-4" />
                    Connect Account
                  </Button>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Default Calendar</h3>
                    <p className="text-sm text-muted-foreground">
                      Select a default calendar for appointments
                    </p>
                  </div>
                  <Select disabled>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="No calendars available" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primary">Primary Calendar</SelectItem>
                    </SelectContent>
                  </Select>
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
                  <Switch />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
