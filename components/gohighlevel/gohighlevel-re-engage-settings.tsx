"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateGoHighLevelReEngageSettings } from "@/app/actions/gohighlevel";

const formSchema = z.object({
  enabled: z.boolean(),
  noShowTag: z.string().min(1, "Tag value is required"),
  timeLimit: z.string().min(1, "Time limit is required"),
  manualMessage: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface GoHighLevelReEngageSettingsProps {
  deploymentId: string | undefined;
  currentSettings?: {
    enabled: boolean;
    noShowTag: string;
    timeLimit: string;
    manualMessage?: string;
  };
}

export function GoHighLevelReEngageSettings({
  deploymentId,
  currentSettings,
}: GoHighLevelReEngageSettingsProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      enabled: currentSettings?.enabled || false,
      noShowTag: currentSettings?.noShowTag || "no-show",
      timeLimit: currentSettings?.timeLimit || "1h",
      manualMessage: currentSettings?.manualMessage || "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      setIsLoading(true);

      if (!deploymentId) {
        toast.error("Deployment ID is required");
        return;
      }

      const result = await updateGoHighLevelReEngageSettings({
        deploymentId,
        settings: {
          enabled: data.enabled,
          noShowTag: data.noShowTag,
          timeLimit: data.timeLimit,
          manualMessage: data.manualMessage || undefined,
          type: "no_show",
        },
      });

      if (result?.data?.success) {
        toast.success("Re-engagement settings updated successfully");
      } else {
        toast.error(
          result?.data?.error?.message || "Failed to update settings"
        );
      }
    } catch (error) {
      toast.error("An error occurred while updating settings");
      console.error("Error updating re-engagement settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const timeLimitOptions = [
    { value: "15m", label: "15 minutes" },
    { value: "30m", label: "30 minutes" },
    { value: "1h", label: "1 hour" },
    { value: "2h", label: "2 hours" },
    { value: "4h", label: "4 hours" },
    { value: "8h", label: "8 hours" },
    { value: "12h", label: "12 hours" },
    { value: "1d", label: "1 day" },
    { value: "2d", label: "2 days" },
    { value: "7d", label: "7 days" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Re-engage with No Shows</CardTitle>
        <CardDescription>
          Automatically send follow-up messages to contacts who are tagged as
          no-shows to help re-engage them and potentially reschedule
          appointments.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="enabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Enable Re-engagement
                    </FormLabel>
                    <FormDescription>
                      Turn on automatic re-engagement messages for no-show
                      contacts
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {form.watch("enabled") && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="noShowTag"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>No-Show Tag</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="no-show"
                          {...field}
                          className="max-w-sm"
                        />
                      </FormControl>
                      <FormDescription>
                        The tag that triggers re-engagement when added to a
                        contact
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="timeLimit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time Delay</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="max-w-sm">
                            <SelectValue placeholder="Select time delay" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {timeLimitOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        How long to wait after the tag is added before sending
                        the re-engagement message
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="manualMessage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custom Message (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Leave empty to auto-generate or enter your custom message..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        If empty, the bot will automatically generate an
                        appropriate re-engagement message. You can provide a
                        custom message here.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
