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

// Delete file function
const deleteFile = async (data: {
  fileId: string;
  botId: string;
  orgId: string;
  knowledgeBaseId: string;
}): Promise<ApiResponse> => {
  try {
    const res = await fetch("/api/knowledge/delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    return await res.json();
  } catch (error) {
    console.error("Error deleting file:", error);
    return {
      error: {
        code: "DELETE_FILE_ERROR",
        message:
          error instanceof Error ? error.message : "Failed to delete file",
      },
    };
  }
};

interface KnowledgeFileListProps {
  botId: string;
  orgId: string;
  knowledgeBase: KnowledgeBase;
}

export function KnowledgeFileList({
  botId,
  orgId,
  knowledgeBase,
}: KnowledgeFileListProps) {
  const { files, removeFile, rollbackFileRemoval } = useKnowledge();
  const [fileToDelete, setFileToDelete] = useState<(typeof files)[0] | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!fileToDelete) return;

    setIsDeleting(true);

    // Optimistically remove the file from the UI
    removeFile(fileToDelete.id);
    const removedFile = fileToDelete;

    try {
      const result = await deleteFile({
        fileId: fileToDelete.id,
        botId,
        orgId,
        knowledgeBaseId: knowledgeBase.id,
      });

      if (result.data?.success) {
        toast.success(`Deleted ${fileToDelete.fileName}`);
        setFileToDelete(null);
      } else {
        // Rollback the optimistic update
        rollbackFileRemoval(removedFile);
        toast.error(result?.error?.message || "Failed to delete file");
      }
    } catch (error) {
      // Rollback the optimistic update
      rollbackFileRemoval(removedFile);
      toast.error("An unexpected error occurred");
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Function to get appropriate icon for file type
  const getFileIcon = (fileType: string) => {
    if (fileType.includes("pdf")) {
      return <Icons.Pdf className="h-8 w-8 text-red-500" />;
    } else if (fileType.includes("spreadsheet") || fileType.includes("excel")) {
      return <Icons.Xls className="h-8 w-8 text-green-600" />;
    } else if (fileType.includes("word") || fileType.includes("document")) {
      return <Icons.Doc className="h-8 w-8 text-blue-500" />;
    } else if (fileType.includes("text/plain")) {
      return <Icons.Txt className="h-8 w-8 text-gray-500" />;
    } else {
      return <Icons.File className="h-8 w-8 text-blue-500" />;
    }
  };

  // Function to format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " bytes";
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    else return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="space-y-4">
      {files.length === 0 ? (
        <div className="text-center p-8 border rounded-md bg-muted/30">
          <p className="text-muted-foreground">No files uploaded yet.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {files.map((file) => (
            <div
              key={file.id}
              className={cn(
                "flex items-center justify-between p-4 border rounded-md hover:bg-muted/30 transition-colors",
                file.isOptimistic && "opacity-70"
              )}
            >
              <div className="flex items-center space-x-4">
                {file.isUploading ? (
                  <Icons.Spinner className="h-8 w-8 text-blue-500 animate-spin" />
                ) : (
                  getFileIcon(file.fileType)
                )}
                <div>
                  <p className="font-medium truncate max-w-[200px] sm:max-w-[300px] md:max-w-[400px]">
                    {file.fileName}
                    {file.isUploading && (
                      <span className="text-sm text-muted-foreground ml-2">
                        (uploading...)
                      </span>
                    )}
                  </p>
                  <div className="flex flex-wrap text-xs text-muted-foreground gap-2">
                    <span>{formatFileSize(file.fileSize)}</span>
                    <span className="hidden xs:inline">•</span>
                    <span>
                      {formatDistanceToNow(new Date(file.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                    {file.metadata?.characterCount && (
                      <>
                        <span className="hidden xs:inline">•</span>
                        <span>
                          {(
                            file.metadata?.characterCount as number
                          )?.toLocaleString()}
                          characters
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
                    file.isUploading && "bg-blue-100 text-blue-800",
                    !file.isUploading &&
                      file.embeddingStatus === "COMPLETED" &&
                      "bg-green-100 text-green-800",
                    !file.isUploading &&
                      file.embeddingStatus === "PROCESSING" &&
                      "bg-yellow-100 text-yellow-800",
                    !file.isUploading &&
                      file.embeddingStatus === "PENDING" &&
                      "bg-blue-100 text-blue-800",
                    !file.isUploading &&
                      file.embeddingStatus === "FAILED" &&
                      "bg-red-100 text-red-800"
                  )}
                >
                  {file.isUploading
                    ? "Uploading"
                    : file.embeddingStatus.charAt(0) +
                      file.embeddingStatus.slice(1).toLowerCase()}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setFileToDelete(file)}
                  disabled={file.isUploading}
                >
                  <Icons.Trash className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AlertDialog
        open={!!fileToDelete}
        onOpenChange={(open) => !open && setFileToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{fileToDelete?.fileName}
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
