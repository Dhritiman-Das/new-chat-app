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
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";

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
  websiteLinkLimit?: number;
  websiteLinkUsage?: number;
}

export function WebsiteSourceForm({
  botId,
  orgId,
  knowledgeBaseId,
  onWebsiteAdded,
  websiteLinkLimit = 0,
  websiteLinkUsage = 0,
}: WebsiteSourceFormProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [limitError, setLimitError] = useState<string | null>(null);
  const router = useRouter();

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
    setLimitError(null);
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
        // Check for specific error codes
        if (response.status === 403) {
          // Handle limit exceeded or subscription issues
          if (result.error?.code === "WEBSITE_LINK_LIMIT_EXCEEDED") {
            toast.error("Website link limit exceeded", {
              description:
                "You've reached your website link limit. Please upgrade your plan to add more websites.",
              action: {
                label: "Go to Billing",
                onClick: () => router.push(`/dashboard/${orgId}/billing`),
              },
            });
            setLimitError(
              "You've reached your website link limit. Please upgrade your plan to add more websites."
            );
          } else if (result.error?.code === "SUBSCRIPTION_REQUIRED") {
            toast.error("Subscription required", {
              description: "Your subscription requires attention.",
              action: {
                label: "Go to Billing",
                onClick: () => router.push(`/dashboard/${orgId}/billing`),
              },
            });
            setLimitError("Your subscription requires attention.");
          } else {
            throw new Error(
              result.error?.message || "Failed to process website"
            );
          }
          return;
        } else {
          throw new Error(result.error?.message || "Failed to process website");
        }
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
  const crawlLimitWatch = form.watch("crawlLimit");

  // Calculate remaining links
  const remainingLinks = websiteLinkLimit - websiteLinkUsage;
  const linkUsagePercentage = websiteLinkLimit
    ? (websiteLinkUsage / websiteLinkLimit) * 100
    : 0;

  return (
    <div className="space-y-4">
      {limitError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="flex justify-between items-center">
            <span>{limitError}</span>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/${orgId}/billing`}>Go to Billing</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Usage indicator */}
      {websiteLinkLimit > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span>Website Links Usage</span>
            <span className="font-semibold">
              {websiteLinkUsage}{" "}
              <span className="text-muted-foreground font-normal">
                / {websiteLinkLimit}
              </span>
            </span>
          </div>
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full ${
                linkUsagePercentage > 90
                  ? "bg-destructive"
                  : linkUsagePercentage > 70
                  ? "bg-amber-500"
                  : "bg-primary"
              }`}
              style={{
                width: `${Math.min(100, linkUsagePercentage)}%`,
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {remainingLinks <= 0
              ? "No website links remaining. Please upgrade your plan."
              : `${remainingLinks} website links remaining`}
          </p>
        </div>
      )}

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
                    disabled={isProcessing || remainingLinks <= 0}
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
                    disabled={isProcessing || remainingLinks <= 0}
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
                      max={
                        remainingLinks > 0 ? Math.min(500, remainingLinks) : 500
                      }
                      disabled={isProcessing || remainingLinks <= 0}
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
                ? `Crawling may take some time. This will use ${crawlLimitWatch} from your website link limit.`
                : "Only the specified webpage will be processed. This will use 1 from your website link limit."}
            </p>
          </div>

          <Button
            type="submit"
            disabled={isProcessing || remainingLinks <= 0}
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
