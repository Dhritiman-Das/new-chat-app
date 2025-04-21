import { useState } from "react";
import { toast } from "sonner";
import { uploadFile } from "@/app/actions/storage";
import { STORAGE_BUCKETS, FileMetadata } from "@/lib/storage/types";

interface UseImageUploadOptions {
  maxSizeMB?: number;
  bucket?: string;
  path?: string;
  fileNamePrefix?: string;
  onSuccess?: (fileUrl: string) => void | Promise<void>;
}

interface ImageUploadResult {
  fileUrl: string | null;
  error: Error | null;
}

export function useImageUpload({
  maxSizeMB = 5,
  bucket = STORAGE_BUCKETS.PUBLIC,
  path = "uploads",
  fileNamePrefix = "image",
  onSuccess,
}: UseImageUploadOptions = {}) {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (
    file: File | null
  ): Promise<ImageUploadResult> => {
    if (!file) {
      return { fileUrl: null, error: null };
    }

    // Check if file is an image
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return {
        fileUrl: null,
        error: new Error("Please select an image file"),
      };
    }

    // Check file size
    const maxSize = maxSizeMB * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`Image must be less than ${maxSizeMB}MB`);
      return {
        fileUrl: null,
        error: new Error(`Image must be less than ${maxSizeMB}MB`),
      };
    }

    try {
      setIsUploading(true);

      // Upload file to storage
      const fileName = `${fileNamePrefix}-${Date.now()}.${
        file.name.split(".").pop() || "jpg"
      }`;

      const uploadResult = await uploadFile({
        file,
        fileName,
        contentType: file.type,
        bucket,
        path,
      });

      // Check if upload was successful
      if (uploadResult?.data?.error) {
        const errorMessage =
          uploadResult.data?.error?.message || "Failed to upload image";
        toast.error(errorMessage);
        return {
          fileUrl: null,
          error: new Error(errorMessage),
        };
      }

      // Extract the URL from the response data
      const responseData = uploadResult?.data?.data as FileMetadata;
      const fileUrl = responseData?.url;

      if (!fileUrl) {
        toast.error("No URL returned from upload");
        return {
          fileUrl: null,
          error: new Error("No URL returned from upload"),
        };
      }

      // Call success callback if provided
      if (onSuccess) {
        await onSuccess(fileUrl);
      }

      return { fileUrl, error: null };
    } catch (error) {
      console.error("Error uploading image:", error);
      const errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred";
      toast.error(errorMessage);
      return {
        fileUrl: null,
        error: error instanceof Error ? error : new Error(errorMessage),
      };
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ): Promise<ImageUploadResult> => {
    const file = event.target.files?.[0] || null;
    return handleFileUpload(file);
  };

  return {
    isUploading,
    handleFileChange,
    handleFileUpload,
  };
}
