"use client";

import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Progress } from "@/components/ui/progress";
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
import { Checkbox } from "@/components/ui/checkbox";

// Form schema
const websiteSourceSchema = z.object({
  url: z
    .string()
    .url("Please enter a valid URL")
    .refine((url) => url.trim().length > 0, {
      message: "URL is required",
    }),
  isDomain: z.boolean(),
  crawlLimit: z.coerce.number().min(1).max(500),
});

type WebsiteSourceFormValues = {
  url: string;
  isDomain: boolean;
  crawlLimit: number;
};

interface WebsiteSourceFormProps {
  botId: string;
  orgId: string;
  knowledgeBaseId: string;
  onWebsiteAdded?: () => void;
}

export function WebsiteSourceForm({
  botId,
  orgId,
  knowledgeBaseId,
  onWebsiteAdded,
}: WebsiteSourceFormProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  // Form setup
  const form = useForm<WebsiteSourceFormValues>({
    resolver: zodResolver(websiteSourceSchema),
    defaultValues: {
      url: "",
      isDomain: false,
      crawlLimit: 50,
    },
  });

  // Mock progress update
  const updateProgress = () => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          clearInterval(interval);
          return prev;
        }
        return prev + 5;
      });
    }, 300);

    return interval;
  };

  const onSubmit = async (data: WebsiteSourceFormValues) => {
    setIsProcessing(true);
    const progressInterval = updateProgress();

    try {
      const response = await fetch("/api/knowledge/website/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          botId,
          orgId,
          knowledgeBaseId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || "Failed to process website");
      }

      if (result.success) {
        toast.success("Website source added successfully", {
          description: `Processed ${result.pagesProcessed} pages from ${data.url}`,
        });

        // Reset form
        form.reset();

        // Call the callback if provided
        if (onWebsiteAdded) {
          onWebsiteAdded();
        }
      } else {
        throw new Error(result.error || "Failed to add website source");
      }
    } catch (error) {
      console.error("Error adding website source:", error);
      toast.error("Failed to add website source", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      clearInterval(progressInterval);
      setProgress(100);

      // Reset after a delay
      setTimeout(() => {
        setIsProcessing(false);
        setProgress(0);
      }, 1000);
    }
  };

  const isDomainWatch = form.watch("isDomain");

  return (
    <div className="space-y-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Website URL</FormLabel>
                <FormControl>
                  <Input
                    placeholder="https://example.com"
                    {...field}
                    disabled={isProcessing}
                  />
                </FormControl>
                <FormDescription>
                  Enter the URL of the website you want to add to your knowledge
                  base
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isDomain"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isProcessing}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Crawl entire domain</FormLabel>
                  <FormDescription>
                    When enabled, the system will crawl multiple pages from the
                    domain instead of just the specified URL
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          {isDomainWatch && (
            <FormField
              control={form.control}
              name="crawlLimit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Page Limit</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      min={1}
                      max={500}
                      disabled={isProcessing}
                    />
                  </FormControl>
                  <FormDescription>
                    Maximum number of pages to crawl (1-500)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <div className="flex items-center space-x-2">
            <Icons.Info className="h-4 w-4 text-blue-500" />
            <p className="text-sm text-muted-foreground">
              {isDomainWatch
                ? "Crawling may take some time depending on the size of the website"
                : "Only the specified webpage will be processed"}
            </p>
          </div>

          <Button
            type="submit"
            disabled={isProcessing}
            className="mt-2 w-full md:w-auto"
          >
            {isProcessing ? (
              <span className="flex items-center">
                <Icons.Spinner className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </span>
            ) : (
              <span>{isDomainWatch ? "Crawl Website" : "Add Website"}</span>
            )}
          </Button>
        </form>
      </Form>

      {isProcessing && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Processing website...</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} />
        </div>
      )}
    </div>
  );
}
