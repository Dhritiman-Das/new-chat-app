"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
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
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  SlackDeploymentConfig,
  SlackIntegrationConfig,
} from "@/app/(protected)/(sidebar)/dashboard/[orgId]/bots/[botId]/deployments/slack/utils";

const formSchema = z.object({
  integrationConfig: z.object({
    maxMessagesToProcess: z.number().min(1).max(100).optional(),
    messageStyle: z.enum(["simple", "blocks", "markdown"]),
    sendThreadedReplies: z.boolean(),
    autoRespondToMentions: z.boolean(),
    autoRespondToDirectMessages: z.boolean(),
    respondToReactions: z.boolean(),
    notificationSettings: z.object({
      enabled: z.boolean(),
      customNotification: z.string().optional(),
    }),
  }),
  deploymentConfig: z.object({
    globalSettings: z.object({
      defaultResponseTime: z.string().optional(),
    }),
    channels: z.array(
      z.object({
        channelId: z.string(),
        channelName: z.string(),
        active: z.boolean(),
        settings: z
          .object({
            mentionsOnly: z.boolean().optional(),
          })
          .optional(),
      })
    ),
  }),
});

type FormValues = z.infer<typeof formSchema>;

interface SlackSettingsProps {
  integration: {
    id: string;
    name: string;
    metadata: {
      team_name?: string;
      channel?: string;
    };
    config?: SlackIntegrationConfig;
    deployment?: {
      id: string;
      config: SlackDeploymentConfig;
    } | null;
  };
}

export function SlackSettings({ integration }: SlackSettingsProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Find the default channel from deployment or fallback to metadata
  const defaultChannel = integration.deployment?.config.channels?.[0] || {
    channelId: integration.metadata.channel || "",
    channelName: integration.metadata.channel || "",
    active: true,
  };

  // Prepare the channels array
  const channels = integration.deployment?.config.channels || [defaultChannel];

  // Prepare the globalSettings
  const globalSettings = integration.deployment?.config.globalSettings || {};

  const defaultValues: FormValues = {
    integrationConfig: {
      maxMessagesToProcess: integration.config?.maxMessagesToProcess || 10,
      messageStyle: integration.config?.messageStyle || "blocks",
      sendThreadedReplies: integration.config?.sendThreadedReplies ?? true,
      autoRespondToMentions: integration.config?.autoRespondToMentions ?? true,
      autoRespondToDirectMessages:
        integration.config?.autoRespondToDirectMessages ?? true,
      respondToReactions: integration.config?.respondToReactions ?? false,
      notificationSettings: {
        enabled: integration.config?.notificationSettings?.enabled ?? false,
        customNotification:
          integration.config?.notificationSettings?.customNotification || "",
      },
    },
    deploymentConfig: {
      globalSettings: {
        defaultResponseTime: globalSettings.defaultResponseTime || "immediate",
      },
      channels,
    },
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const onSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true);
      // Update integration config and deployment settings
      const response = await fetch(
        `/api/integrations/${integration.id}/slack/settings`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            config: values.integrationConfig,
            deployment: {
              channels: values.deploymentConfig.channels,
              globalSettings: values.deploymentConfig.globalSettings,
            },
          }),
        }
      );

      if (response.ok) {
        toast.success("Slack settings updated successfully");
      } else {
        throw new Error("Failed to update settings");
      }
    } catch (error) {
      console.error("Error updating Slack settings:", error);
      toast.error("Failed to update Slack settings. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const notificationsEnabled = form.watch(
    "integrationConfig.notificationSettings.enabled"
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Icons.Slack className="h-5 w-5 text-[#4A154B]" />
          <CardTitle>Slack Integration Settings</CardTitle>
        </div>
        <CardDescription>
          Configure how your bot interacts with Slack
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              {/* Integration Config Section */}
              <div className="space-y-3 border rounded-md p-4">
                <h3 className="font-medium">Integration Settings</h3>

                <FormField
                  control={form.control}
                  name="integrationConfig.maxMessagesToProcess"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Messages to Process</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        Maximum number of messages to process in a conversation
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="integrationConfig.messageStyle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message Style</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a message style" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="simple">Simple Text</SelectItem>
                          <SelectItem value="blocks">Block Kit UI</SelectItem>
                          <SelectItem value="markdown">Markdown</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        How messages will be formatted in Slack
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="integrationConfig.sendThreadedReplies"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between space-y-0 rounded-md p-2 hover:bg-muted">
                      <div>
                        <FormLabel className="font-normal">
                          Threaded Replies
                        </FormLabel>
                        <FormDescription>
                          Reply in threads instead of sending new messages
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

                <FormField
                  control={form.control}
                  name="integrationConfig.autoRespondToMentions"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between space-y-0 rounded-md p-2 hover:bg-muted">
                      <div>
                        <FormLabel className="font-normal">
                          Auto-respond to Mentions
                        </FormLabel>
                        <FormDescription>
                          Automatically respond when the bot is mentioned
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

                <FormField
                  control={form.control}
                  name="integrationConfig.autoRespondToDirectMessages"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between space-y-0 rounded-md p-2 hover:bg-muted">
                      <div>
                        <FormLabel className="font-normal">
                          Auto-respond to DMs
                        </FormLabel>
                        <FormDescription>
                          Automatically respond to direct messages
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

                <FormField
                  control={form.control}
                  name="integrationConfig.respondToReactions"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between space-y-0 rounded-md p-2 hover:bg-muted">
                      <div>
                        <FormLabel className="font-normal">
                          Respond to Reactions
                        </FormLabel>
                        <FormDescription>
                          Respond when users add reactions to bot messages
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

                <FormField
                  control={form.control}
                  name="integrationConfig.notificationSettings.enabled"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between space-y-0 rounded-md p-2 hover:bg-muted">
                      <div>
                        <FormLabel className="font-normal">
                          Notifications
                        </FormLabel>
                        <FormDescription>
                          Send notifications when the bot is updated or offline
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

                {notificationsEnabled && (
                  <FormField
                    control={form.control}
                    name="integrationConfig.notificationSettings.customNotification"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Custom Notification</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="The bot has been updated with new capabilities!"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Custom message to send when the bot is updated
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {/* Deployment Config Section */}
              <div className="space-y-3 border rounded-md p-4">
                <h3 className="font-medium">Deployment Settings</h3>

                <FormField
                  control={form.control}
                  name="deploymentConfig.globalSettings.defaultResponseTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Response Time</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select response time" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="immediate">Immediate</SelectItem>
                          <SelectItem value="delayed">
                            Slightly Delayed
                          </SelectItem>
                          <SelectItem value="typing">
                            Show Typing Indicator
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        How quickly the bot responds to messages
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Channels Section */}
              <div className="space-y-3 border rounded-md p-4">
                <h3 className="font-medium">Channels</h3>
                {form
                  .watch("deploymentConfig.channels")
                  .map((channel, index) => (
                    <div key={index} className="space-y-2 pt-2">
                      <FormField
                        control={form.control}
                        name={`deploymentConfig.channels.${index}.channelName`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Channel Name</FormLabel>
                            <FormControl>
                              <Input placeholder="general" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`deploymentConfig.channels.${index}.active`}
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between space-y-0 rounded-md p-2 hover:bg-muted">
                            <div>
                              <FormLabel className="font-normal">
                                Active
                              </FormLabel>
                              <FormDescription>
                                Enable or disable the bot in this channel
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
                      <FormField
                        control={form.control}
                        name={`deploymentConfig.channels.${index}.settings.mentionsOnly`}
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between space-y-0 rounded-md p-2 hover:bg-muted">
                            <div>
                              <FormLabel className="font-normal">
                                Mentions Only
                              </FormLabel>
                              <FormDescription>
                                Only respond when the bot is mentioned
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value ?? false}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const channels = form.getValues(
                      "deploymentConfig.channels"
                    );
                    form.setValue("deploymentConfig.channels", [
                      ...channels,
                      {
                        channelId: "",
                        channelName: "",
                        active: true,
                        settings: { mentionsOnly: false },
                      },
                    ]);
                  }}
                >
                  Add Channel
                </Button>
              </div>
            </div>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Icons.Spinner className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Settings"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
