"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Icons } from "@/components/icons";
import { useKnowledge } from "./knowledge-context";

interface UploadResponse {
  success: boolean;
  data?: {
    fileId: string;
    fileName: string;
    characterCount: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

// Define accepted file types
const ACCEPTED_FILE_TYPES = {
  "application/pdf": [".pdf"],
  "text/plain": [".txt"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx",
  ],
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
    ".xlsx",
  ],
};

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

interface FileUploaderProps {
  botId: string;
  orgId: string;
  knowledgeBaseId: string;
}

export function FileUploader({
  botId,
  orgId,
  knowledgeBaseId,
}: FileUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { addOptimisticFile, updateFileAfterUpload, removeOptimisticFile } =
    useKnowledge();

  // Mock progress update
  const updateProgress = useCallback(() => {
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 95) {
          clearInterval(interval);
          return prev;
        }
        return prev + 5;
      });
    }, 100);

    return interval;
  }, []);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      setIsUploading(true);
      const progressInterval = updateProgress();

      try {
        for (const file of acceptedFiles) {
          // Add optimistic file immediately
          const tempId = addOptimisticFile(file, botId, knowledgeBaseId);

          try {
            // Create form data with the file and metadata
            const formData = new FormData();
            formData.append("file", file);
            formData.append("botId", botId);
            formData.append("orgId", orgId);
            formData.append("knowledgeBaseId", knowledgeBaseId);

            // Upload the file
            const response = await fetch("/api/knowledge/upload", {
              method: "POST",
              body: formData,
            });

            if (!response.ok) {
              throw new Error(`Upload failed with status: ${response.status}`);
            }

            const result = (await response.json()) as UploadResponse;

            if (result.success && result.data) {
              // Update the optimistic file with the real data
              updateFileAfterUpload(tempId, {
                id: result.data.fileId,
                knowledgeBaseId,
                fileName: file.name,
                fileType: file.type,
                filePath: "",
                fileSize: file.size,
                embeddingStatus: "COMPLETED" as const,
                metadata: { characterCount: result.data.characterCount },
                createdAt: new Date(),
                updatedAt: new Date(),
              });

              toast.success(
                `Uploaded ${
                  file.name
                } (${result.data.characterCount.toLocaleString()} characters)`
              );
            } else {
              throw new Error(result.error?.message || "Failed to upload file");
            }
          } catch (error) {
            // Remove the optimistic file on error
            removeOptimisticFile(tempId);
            toast.error(
              `Error uploading ${file.name}: ${
                error instanceof Error ? error.message : "Unknown error"
              }`
            );
          }
        }
      } catch (error) {
        console.error("Upload error:", error);
      } finally {
        clearInterval(progressInterval);
        setUploadProgress(100);

        // Reset after a delay
        setTimeout(() => {
          setIsUploading(false);
          setUploadProgress(0);
        }, 1000);
      }
    },
    [
      botId,
      orgId,
      knowledgeBaseId,
      updateProgress,
      addOptimisticFile,
      updateFileAfterUpload,
      removeOptimisticFile,
    ]
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } =
    useDropzone({
      onDrop,
      accept: ACCEPTED_FILE_TYPES,
      maxSize: MAX_FILE_SIZE,
      disabled: isUploading,
    });

  // Display file rejection errors
  fileRejections.forEach(({ file, errors }) => {
    const errorMessages = errors.map((e) => e.message).join(", ");
    toast.error(`${file.name}: ${errorMessages}`);
  });

  return (
    <div className="w-full space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center hover:bg-muted/50 transition-colors cursor-pointer ${
          isDragActive ? "border-primary bg-muted/50" : "border-border"
        } ${isUploading ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center space-y-3">
          <Icons.Upload className="h-10 w-10 text-muted-foreground" />
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {isDragActive
                ? "Drop files here..."
                : "Drag and drop files here or click to browse"}
            </p>
            <p className="text-xs text-muted-foreground">
              Supported formats: PDF, TXT, DOC, DOCX, XLS, XLSX (Max 10MB)
            </p>
          </div>
        </div>
      </div>

      {isUploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Uploading...</span>
            <span>{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} />
        </div>
      )}
    </div>
  );
}
