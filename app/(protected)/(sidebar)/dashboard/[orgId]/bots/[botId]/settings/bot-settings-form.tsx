"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { updateBot } from "@/app/actions/bots";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { Switch } from "@/components/ui/switch";
import { TemplateDialog } from "./template-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAvailableModels, type Model } from "@/lib/models";
import { Icons } from "@/components/icons";

interface BotSettingsFormProps {
  bot: {
    id: string;
    name: string;
    description: string | null;
    systemPrompt: string;
    defaultModelId?: string | null;
    isActive: boolean;
  };
  orgId: string;
}

export default function BotSettingsForm({ bot, orgId }: BotSettingsFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableModels, setAvailableModels] = useState<Model[]>([]);

  useEffect(() => {
    // Get available models
    setAvailableModels(getAvailableModels());
  }, []);

  const form = useForm({
    defaultValues: {
      name: bot.name,
      description: bot.description || "",
      systemPrompt: bot.systemPrompt,
      defaultModelId: bot.defaultModelId || "",
      isActive: bot.isActive,
    },
  });

  const onSubmit = async (values: {
    name: string;
    description: string;
    systemPrompt: string;
    defaultModelId: string;
    isActive: boolean;
  }) => {
    console.log("Form is being submitted. Values: ", values);
    setIsSubmitting(true);
    try {
      const response = await updateBot({
        id: bot.id,
        name: values.name,
        description: values.description || null,
        systemPrompt: values.systemPrompt,
        defaultModelId: values.defaultModelId || null,
        isActive: values.isActive,
      });

      if (response.success) {
        toast("Bot updated successfully", {
          description: "Your bot settings have been saved",
        });
      } else {
        toast("Failed to update bot", {
          description:
            response.error?.message || "An unexpected error occurred",
        });
      }
    } catch {
      toast("Failed to update bot", {
        description: "An unexpected error occurred",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to get provider icon component
  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case "xai":
        return Icons.X;
      case "openai":
        return Icons.OpenAI;
      case "anthropic":
        return Icons.Anthropic;
      case "gemini":
        return Icons.Gemini;
      case "perplexity":
        return Icons.Perplexity;
      default:
        return null;
    }
  };

  // Function to handle system prompt update from template
  const handleApplyTemplate = (newSystemPrompt: string) => {
    console.log("Applying template. New system prompt: ", newSystemPrompt);
    form.setValue("systemPrompt", newSystemPrompt);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bot Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter bot name"
                    {...field}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormDescription>
                  The name of your bot that will be displayed to users.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="defaultModelId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Default AI Model</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={isSubmitting}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a default model">
                        {field.value &&
                          (() => {
                            const model = availableModels.find(
                              (m) => m.id === field.value
                            );
                            if (model) {
                              const ProviderIcon = getProviderIcon(
                                model.provider
                              );
                              return (
                                <div className="flex items-center w-full">
                                  {ProviderIcon && (
                                    <ProviderIcon className="h-4 w-4 mr-2 inline flex-shrink-0" />
                                  )}
                                  <span className="truncate">
                                    {model.providerName} / {model.name}
                                  </span>
                                </div>
                              );
                            }
                            return "Select a default model";
                          })()}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="max-h-80 overflow-y-auto">
                    {availableModels.map((model) => {
                      const ModelIcon = getProviderIcon(model.provider);
                      return (
                        <SelectItem key={model.id} value={model.id}>
                          <div className="flex items-center w-full">
                            {ModelIcon && (
                              <ModelIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                            )}
                            <span className="truncate">
                              {model.providerName} / {model.name}
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <FormDescription>
                  This will be the AI model that generate responses for your
                  bot.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter bot description"
                  {...field}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormDescription>
                A brief description of what your bot does.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="systemPrompt"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>System Prompt</FormLabel>
                <TemplateDialog
                  orgId={orgId}
                  onApplyTemplate={handleApplyTemplate}
                />
              </div>
              <FormControl>
                <Textarea
                  placeholder="Enter system prompt"
                  {...field}
                  className="min-h-[120px]"
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormDescription>
                Instructions that define how your bot behaves and responds.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Active Status</FormLabel>
                <FormDescription>
                  When active, your bot can be accessed by users.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isSubmitting}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
      </form>
    </Form>
  );
}
