"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { KnowledgeBase } from "@/lib/types/prisma";
import { ActionResponse as BaseActionResponse } from "@/app/actions/types";
import { Icons } from "../icons";
import { useKnowledge } from "./knowledge-context";

// Define the actual API response structure
interface ApiResponse extends Omit<BaseActionResponse, "success"> {
  data?: {
    success: boolean;
    [key: string]: unknown;
  };
}

// Delete website function
const deleteWebsite = async (data: {
  websiteId: string;
  botId: string;
  orgId: string;
  knowledgeBaseId: string;
}): Promise<ApiResponse> => {
  try {
    const res = await fetch("/api/knowledge/website/delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    return await res.json();
  } catch (error) {
    console.error("Error deleting website:", error);
    return {
      error: {
        code: "DELETE_WEBSITE_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to delete website",
      },
    };
  }
};

interface WebsiteSourceListProps {
  botId: string;
  orgId: string;
  knowledgeBase: KnowledgeBase;
}

export function WebsiteSourceList({
  botId,
  orgId,
  knowledgeBase,
}: WebsiteSourceListProps) {
  const { websites, removeWebsite, rollbackWebsiteRemoval } = useKnowledge();
  const [websiteToDelete, setWebsiteToDelete] = useState<
    (typeof websites)[0] | null
  >(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!websiteToDelete) return;

    setIsDeleting(true);

    // Optimistically remove the website from the UI
    removeWebsite(websiteToDelete.id);
    const removedWebsite = websiteToDelete;

    try {
      const result = await deleteWebsite({
        websiteId: websiteToDelete.id,
        botId,
        orgId,
        knowledgeBaseId: knowledgeBase.id,
      });

      if (result.data?.success) {
        toast.success(`Deleted ${websiteToDelete.url}`);
        setWebsiteToDelete(null);
      } else {
        // Rollback the optimistic update
        rollbackWebsiteRemoval(removedWebsite);
        toast.error(result?.error?.message || "Failed to delete website");
      }
    } catch (error) {
      // Rollback the optimistic update
      rollbackWebsiteRemoval(removedWebsite);
      toast.error("An unexpected error occurred");
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Function to format domain URL
  const formatUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname + (urlObj.pathname !== "/" ? urlObj.pathname : "");
    } catch {
      return url;
    }
  };

  return (
    <div className="space-y-4">
      {websites.length === 0 ? (
        <div className="text-center p-8 border rounded-md bg-muted/30">
          <p className="text-muted-foreground">No websites added yet.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {websites.map((website) => (
            <div
              key={website.id}
              className={cn(
                "flex items-center justify-between p-4 border rounded-md hover:bg-muted/30 transition-colors",
                website.isOptimistic && "opacity-70"
              )}
            >
              <div className="flex items-center space-x-4">
                {website.isProcessing ? (
                  <Icons.Spinner className="h-8 w-8 text-blue-500 animate-spin" />
                ) : (
                  <Icons.Globe className="h-8 w-8 text-blue-500" />
                )}
                <div>
                  <p className="font-medium truncate max-w-[200px] sm:max-w-[300px] md:max-w-[400px]">
                    {website.title || formatUrl(website.url)}
                    {website.isProcessing && (
                      <span className="text-sm text-muted-foreground ml-2">
                        (processing...)
                      </span>
                    )}
                  </p>
                  <div className="flex flex-wrap text-xs text-muted-foreground gap-2">
                    <span>{website.isDomain ? "Domain" : "Single page"}</span>
                    <span className="hidden xs:inline">•</span>
                    <span>
                      {website.lastScrapedAt
                        ? formatDistanceToNow(new Date(website.lastScrapedAt), {
                            addSuffix: true,
                          })
                        : formatDistanceToNow(new Date(website.createdAt), {
                            addSuffix: true,
                          })}
                    </span>
                    {website.metadata?.pagesProcessed && (
                      <>
                        <span className="hidden xs:inline">•</span>
                        <span>
                          {Number(website.metadata.pagesProcessed)} page
                          {Number(website.metadata.pagesProcessed) !== 1
                            ? "s"
                            : ""}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <div
                  className={cn(
                    "px-2 py-1 rounded-full text-xs",
                    website.isProcessing && "bg-blue-100 text-blue-800",
                    !website.isProcessing &&
                      website.embeddingStatus === "COMPLETED" &&
                      "bg-green-100 text-green-800",
                    !website.isProcessing &&
                      website.embeddingStatus === "PROCESSING" &&
                      "bg-yellow-100 text-yellow-800",
                    !website.isProcessing &&
                      website.embeddingStatus === "PENDING" &&
                      "bg-blue-100 text-blue-800",
                    !website.isProcessing &&
                      website.embeddingStatus === "FAILED" &&
                      "bg-red-100 text-red-800"
                  )}
                >
                  {website.isProcessing
                    ? "Processing"
                    : website.embeddingStatus.charAt(0) +
                      website.embeddingStatus.slice(1).toLowerCase()}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setWebsiteToDelete(website)}
                  disabled={website.isProcessing}
                >
                  <Icons.Trash className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AlertDialog
        open={!!websiteToDelete}
        onOpenChange={(open) => !open && setWebsiteToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Website Source</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;
              {websiteToDelete?.title || formatUrl(websiteToDelete?.url || "")}
              &rdquo;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
