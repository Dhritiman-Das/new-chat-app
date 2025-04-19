"use server";

import { createSafeActionClient } from "next-safe-action";
import { z } from "zod";
import { auth } from "@/lib/auth";
import type { ActionResponse } from "@/app/actions/types";
import { STORAGE_BUCKETS, StorageBucket } from "@/lib/storage/types";
import { storage } from "@/lib/storage/client";

// Create safe action client
const action = createSafeActionClient();

// Get the actual bucket values from the constant
const bucketValues = Object.values(STORAGE_BUCKETS) as [string, ...string[]];

// File upload schema
const uploadSchema = z.object({
  file: z.instanceof(Blob),
  fileName: z.string(),
  contentType: z.string(),
  organizationId: z.string().optional(),
  bucket: z.enum(bucketValues).optional(),
  path: z.string().optional(),
  metadata: z.record(z.string()).optional(),
});

// File operations schema
const fileOperationSchema = z.object({
  fileId: z.string(),
  bucket: z.enum(bucketValues),
});

// List files schema
const listFilesSchema = z.object({
  organizationId: z.string().optional(),
  bucket: z.enum(bucketValues).optional(),
  path: z.string().optional(),
  limit: z.number().min(1).max(1000).optional(),
  offset: z.number().min(0).optional(),
});

// Upload file action
export const uploadFile = action
  .schema(uploadSchema)
  .action(async ({ parsedInput }): Promise<ActionResponse> => {
    try {
      const session = await auth();

      const {
        file,
        fileName,
        contentType,
        organizationId,
        bucket,
        path,
        metadata,
      } = parsedInput;

      if (!session?.user?.id) {
        return {
          success: false,
          error: {
            message: "Authentication required",
            code: "UNAUTHORIZED",
          },
        };
      }

      const result = await storage.upload({
        file,
        fileName,
        contentType,
        organizationId,
        bucket: bucket as StorageBucket,
        path,
        metadata,
        userId: session.user.id,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error("Error uploading file:", error);
      return {
        success: false,
        error: {
          message:
            error instanceof Error ? error.message : "Failed to upload file",
          code: "UPLOAD_FAILED",
        },
      };
    }
  });

// Get file URL action
export const getFileUrl = action
  .schema(fileOperationSchema)
  .action(async ({ parsedInput }): Promise<ActionResponse> => {
    try {
      const session = await auth();
      const { fileId, bucket } = parsedInput;

      if (!session?.user?.id) {
        return {
          success: false,
          error: {
            message: "Authentication required",
            code: "UNAUTHORIZED",
          },
        };
      }

      const url = await storage.getFileUrl(fileId, bucket as StorageBucket);

      if (!url) {
        return {
          success: false,
          error: {
            message: "File not found",
            code: "NOT_FOUND",
          },
        };
      }

      return {
        success: true,
        data: { url },
      };
    } catch (error) {
      console.error("Error getting file URL:", error);
      return {
        success: false,
        error: {
          message:
            error instanceof Error ? error.message : "Failed to get file URL",
          code: "URL_RETRIEVAL_FAILED",
        },
      };
    }
  });

// Delete file action
export const deleteFile = action
  .schema(fileOperationSchema)
  .action(async ({ parsedInput }): Promise<ActionResponse> => {
    try {
      const session = await auth();
      const { fileId, bucket } = parsedInput;
      if (!session?.user?.id) {
        return {
          success: false,
          error: {
            message: "Authentication required",
            code: "UNAUTHORIZED",
          },
        };
      }

      const result = await storage.delete(fileId, bucket as StorageBucket);

      if (!result) {
        return {
          success: false,
          error: {
            message: "Failed to delete file",
            code: "DELETE_FAILED",
          },
        };
      }

      return {
        success: true,
        data: { deleted: true },
      };
    } catch (error) {
      console.error("Error deleting file:", error);
      return {
        success: false,
        error: {
          message:
            error instanceof Error ? error.message : "Failed to delete file",
          code: "DELETE_FAILED",
        },
      };
    }
  });

// List files action
export const listFiles = action
  .schema(listFilesSchema)
  .action(async ({ parsedInput }): Promise<ActionResponse> => {
    try {
      const session = await auth();
      const { organizationId, bucket, path, limit, offset } = parsedInput;

      if (!session?.user?.id) {
        return {
          success: false,
          error: {
            message: "Authentication required",
            code: "UNAUTHORIZED",
          },
        };
      }

      const files = await storage.listFiles({
        userId: session.user.id,
        organizationId,
        bucket: bucket as StorageBucket,
        path,
        limit,
        offset,
      });

      return {
        success: true,
        data: { files },
      };
    } catch (error) {
      console.error("Error listing files:", error);
      return {
        success: false,
        error: {
          message:
            error instanceof Error ? error.message : "Failed to list files",
          code: "LIST_FAILED",
        },
      };
    }
  });
