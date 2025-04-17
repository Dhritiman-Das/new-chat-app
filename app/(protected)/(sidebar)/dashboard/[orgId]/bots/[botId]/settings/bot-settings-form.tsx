"use client";

import { useState } from "react";
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

interface BotSettingsFormProps {
  bot: {
    id: string;
    name: string;
    description: string | null;
    systemPrompt: string;
    isActive: boolean;
  };
}

export default function BotSettingsForm({ bot }: BotSettingsFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    defaultValues: {
      name: bot.name,
      description: bot.description || "",
      systemPrompt: bot.systemPrompt,
      isActive: bot.isActive,
    },
  });

  const onSubmit = async (values: {
    name: string;
    description: string;
    systemPrompt: string;
    isActive: boolean;
  }) => {
    setIsSubmitting(true);
    try {
      const response = await updateBot({
        id: bot.id,
        name: values.name,
        description: values.description || null,
        systemPrompt: values.systemPrompt,
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
              <FormLabel>System Prompt</FormLabel>
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
