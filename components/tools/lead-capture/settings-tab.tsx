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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { updateLeadCaptureConfig } from "@/app/actions/lead-capture";
import { FIELD_OPTIONS, SerializableTool } from "./types";

interface SettingsTabProps {
  tool: SerializableTool;
  botId: string;
}

const configSchema = z.object({
  requiredFields: z.array(z.string()).min(1, {
    message: "At least one field must be required",
  }),
  leadNotifications: z.boolean(),
  leadCaptureTriggers: z.array(z.string()),
  customTriggerPhrases: z.array(z.string()).optional(),
});

export function SettingsTab({ tool, botId }: SettingsTabProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfigLoading, setIsConfigLoading] = useState(false);
  const [newTrigger, setNewTrigger] = useState("");
  const [newCustomTrigger, setNewCustomTrigger] = useState("");

  const form = useForm<z.infer<typeof configSchema>>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      requiredFields: (tool.defaultConfig?.requiredFields as string[]) || [
        "name",
        "email",
      ],
      leadNotifications: tool.defaultConfig?.leadNotifications !== false,
      leadCaptureTriggers: (tool.defaultConfig
        ?.leadCaptureTriggers as string[]) || [
        "pricing",
        "demo",
        "contact",
        "quote",
      ],
      customTriggerPhrases:
        (tool.defaultConfig?.customTriggerPhrases as string[]) || [],
    },
  });

  // Fetch config on mount
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
          if (data.config.requiredFields) {
            form.setValue("requiredFields", data.config.requiredFields);
          }

          if (data.config.leadNotifications !== undefined) {
            form.setValue("leadNotifications", data.config.leadNotifications);
          }

          if (
            data.config.leadCaptureTriggers &&
            Array.isArray(data.config.leadCaptureTriggers)
          ) {
            form.setValue(
              "leadCaptureTriggers",
              data.config.leadCaptureTriggers
            );
          }

          if (
            data.config.customTriggerPhrases &&
            Array.isArray(data.config.customTriggerPhrases)
          ) {
            form.setValue(
              "customTriggerPhrases",
              data.config.customTriggerPhrases
            );
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

      const result = await updateLeadCaptureConfig({
        botId,
        toolId: tool.id,
        config: values,
      });

      if (result && result.data && result.data.success) {
        toast.success("Lead capture configuration saved successfully");
      } else {
        toast.error(
          result?.data?.error?.message || "Failed to save configuration"
        );
      }
    } catch (error) {
      console.error("Error saving configuration:", error);
      toast.error("Failed to save configuration");
    } finally {
      setIsSaving(false);
    }
  }

  function addCustomTrigger() {
    if (!newTrigger || newTrigger.trim() === "") return;

    const currentTriggers = form.getValues().leadCaptureTriggers || [];
    form.setValue("leadCaptureTriggers", [
      ...currentTriggers,
      newTrigger.trim().toLowerCase(),
    ]);
    setNewTrigger("");
  }

  function removeTrigger(trigger: string) {
    const currentTriggers = form.getValues().leadCaptureTriggers || [];
    form.setValue(
      "leadCaptureTriggers",
      currentTriggers.filter((t) => t !== trigger)
    );
  }

  function addCustomTriggerPhrase() {
    if (!newCustomTrigger || newCustomTrigger.trim() === "") return;

    const currentPhrases = form.getValues().customTriggerPhrases || [];
    form.setValue("customTriggerPhrases", [
      ...currentPhrases,
      newCustomTrigger.trim(),
    ]);
    setNewCustomTrigger("");
  }

  function removeCustomTriggerPhrase(phrase: string) {
    const currentPhrases = form.getValues().customTriggerPhrases || [];
    form.setValue(
      "customTriggerPhrases",
      currentPhrases.filter((p) => p !== phrase)
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lead Capture Settings</CardTitle>
        <CardDescription>
          Configure how your bot collects lead information
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div>
                <h3 className="text-md font-medium mb-2">Required Fields</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Select what information your bot should collect from leads
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {FIELD_OPTIONS.map((field) => (
                    <FormField
                      key={field.id}
                      control={form.control}
                      name="requiredFields"
                      render={({ field: formField }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={formField.value?.includes(field.id)}
                              onCheckedChange={(checked) => {
                                const currentValue = formField.value || [];
                                return checked
                                  ? formField.onChange([
                                      ...currentValue,
                                      field.id,
                                    ])
                                  : formField.onChange(
                                      currentValue.filter(
                                        (value) => value !== field.id
                                      )
                                    );
                              }}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm font-medium cursor-pointer">
                              {field.label}
                            </FormLabel>
                            <FormDescription>
                              Collect {field.label.toLowerCase()} from prospects
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </div>

              <Separator />

              <FormField
                control={form.control}
                name="leadNotifications"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Email Notifications
                      </FormLabel>
                      <FormDescription>
                        Receive email notifications when new leads are captured
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

              <Separator />

              <div>
                <h3 className="text-md font-medium mb-2">
                  Lead Capture Triggers
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Keywords that trigger the lead capture flow in conversations
                </p>

                <div className="flex flex-wrap gap-2 mb-4">
                  {form.watch("leadCaptureTriggers")?.map((trigger) => (
                    <Badge
                      key={trigger}
                      variant="secondary"
                      className="gap-1 px-3 py-1"
                    >
                      {trigger}
                      <button
                        type="button"
                        onClick={() => removeTrigger(trigger)}
                        className="ml-1 rounded-full h-4 w-4 inline-flex items-center justify-center hover:bg-destructive/20"
                      >
                        <Icons.X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Add new trigger word..."
                    value={newTrigger}
                    onChange={(e) => setNewTrigger(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addCustomTrigger}
                  >
                    Add
                  </Button>
                </div>
              </div>

              <Separator className="my-6" />

              <div>
                <h3 className="text-md font-medium mb-2">
                  Custom Trigger Phrases
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add longer phrases that will trigger lead capture (like
                  questions or specific requests)
                </p>

                <div className="flex flex-wrap gap-2 mb-4">
                  {form.watch("customTriggerPhrases")?.map((phrase) => (
                    <Badge
                      key={phrase}
                      variant="secondary"
                      className="gap-1 px-3 py-1"
                    >
                      {phrase}
                      <button
                        type="button"
                        onClick={() => removeCustomTriggerPhrase(phrase)}
                        className="ml-1 rounded-full h-4 w-4 inline-flex items-center justify-center hover:bg-destructive/20"
                      >
                        <Icons.X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Add custom phrase... (e.g., 'What are your pricing options?')"
                    value={newCustomTrigger}
                    onChange={(e) => setNewCustomTrigger(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addCustomTriggerPhrase}
                  >
                    Add
                  </Button>
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
  );
}
