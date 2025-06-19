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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState, useEffect } from "react";
import { useQueryState } from "nuqs";
import { toast } from "sonner";

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

interface PauseConversationToolProps {
  tool: SerializableTool;
  botId: string;
  orgId: string;
}

const configSchema = z.object({
  pauseConditionPrompt: z.string().min(1, {
    message: "Pause condition prompt is required",
  }),
  pauseMessage: z.string().optional(),
});

export default function PauseConversationTool({
  tool,
  botId,
  orgId,
}: PauseConversationToolProps) {
  console.log("orgId", orgId);

  const [activeTab, setActiveTab] = useQueryState("tab", {
    defaultValue: "settings",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfigLoading, setIsConfigLoading] = useState(false);

  const form = useForm<z.infer<typeof configSchema>>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      pauseConditionPrompt:
        (tool.defaultConfig?.pauseConditionPrompt as string) ||
        "The user wants to end the conversation or talk to a human",
      pauseMessage: (tool.defaultConfig?.pauseMessage as string) || "",
    },
  });

  // Fetch initial configuration
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setIsConfigLoading(true);
        const response = await fetch(
          `/api/bots/${botId}/tools/${tool.id}/config`
        );
        if (!response.ok) {
          throw new Error(
            `Failed to fetch tool config: ${response.statusText}`
          );
        }

        const data = await response.json();

        if (data.success && data.config) {
          // Update the form with existing config values
          if (data.config.pauseConditionPrompt) {
            form.setValue(
              "pauseConditionPrompt",
              data.config.pauseConditionPrompt
            );
          }

          if (data.config.pauseMessage !== undefined) {
            form.setValue("pauseMessage", data.config.pauseMessage);
          }
        }
      } catch (error) {
        console.error("Error fetching tool config:", error);
        // Use default values from the form
      } finally {
        setIsConfigLoading(false);
        setIsLoading(false);
      }
    };

    fetchConfig();
  }, [botId, tool.id, form]);

  async function onSubmit(values: z.infer<typeof configSchema>) {
    try {
      setIsSaving(true);

      // Create the update payload
      const updatePayload = {
        botId,
        toolId: tool.id,
        config: values,
      };

      // Make the API call to update configuration
      const response = await fetch(
        `/api/bots/${botId}/tools/${tool.id}/config`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatePayload),
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to update configuration: ${response.statusText}`
        );
      }

      const result = await response.json();

      if (result && result.success) {
        toast.success("Pause conversation configuration saved successfully");
      } else {
        toast.error(result?.error?.message || "Failed to save configuration");
      }
    } catch (error) {
      console.error("Error saving configuration:", error);
      toast.error("Failed to save configuration");
    } finally {
      setIsSaving(false);
    }
  }

  return (
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
        </TabsList>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Pause Conversation Settings</CardTitle>
              <CardDescription>
                Configure when your bot should pause conversations and transfer
                control to humans
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
                    className="space-y-8"
                  >
                    <div>
                      <h3 className="text-md font-medium mb-2">
                        Pause Conditions
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Define the conditions that should trigger conversation
                        pausing
                      </p>

                      <FormField
                        control={form.control}
                        name="pauseConditionPrompt"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pause Condition Prompt</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Describe when the conversation should be paused..."
                                className="min-h-[100px]"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Describe the specific conditions, phrases, or
                              situations that should trigger the conversation to
                              be paused. Be as specific as possible. For
                              example: When the user asks to speak to a human,
                              wants to escalate to a manager, or says goodbye
                              and wants to end the conversation.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />

                    <div>
                      <h3 className="text-md font-medium mb-2">
                        Pause Response
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Configure the message shown when a conversation is
                        paused
                      </p>

                      <FormField
                        control={form.control}
                        name="pauseMessage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pause Message</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Message to show when conversation is paused..."
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              This message will be displayed to users when the
                              conversation is paused. Leave empty to pause
                              without sending any response to the user.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <Icons.Warning className="h-5 w-5 text-amber-600 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-medium text-amber-800">
                            How It Works
                          </h4>
                          <p className="text-sm text-amber-700 mt-1">
                            When this tool is enabled, it automatically checks
                            every user message against your pause conditions. If
                            a match is found, the conversation will be paused
                            immediately and no further bot responses will be
                            sent until a human takes over.
                          </p>
                        </div>
                      </div>
                    </div>

                    <Button type="submit" disabled={isSaving}>
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
                      <Icons.MessageCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
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
      </Tabs>
    </div>
  );
}
