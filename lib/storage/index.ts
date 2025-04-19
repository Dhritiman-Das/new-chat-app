"use server";

import { createClient } from "@/utils/supabase/job";
import { v4 as uuidv4 } from "uuid";
import {
  FileMetadata,
  ListFilesParams,
  StorageBucket,
  STORAGE_BUCKETS,
  UploadParams,
} from "./types";

// Server actions for file storage operations
export async function uploadFile(params: UploadParams): Promise<FileMetadata> {
  if (!params.userId) {
    throw new Error("User authentication required");
  }

  const supabase = createClient();
  const bucket = params.bucket || (STORAGE_BUCKETS.PRIVATE as StorageBucket);
  const filePath = generateFilePath(params);

  const { error } = await supabase.storage
    .from(bucket)
    .upload(filePath, params.file, {
      contentType: params.contentType,
      upsert: false,
      cacheControl: "3600",
      ...(params.metadata && { customMetadata: params.metadata }),
    });

  if (error) {
    console.error("Error uploading file:", error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  const { data: urlData } = await supabase.storage
    .from(bucket)
    .createSignedUrl(filePath, 60 * 60 * 24 * 7); // 7 days

  const url = urlData?.signedUrl || "";

  const fileMetadata: FileMetadata = {
    id: filePath.split("/").pop()?.split("-")[0] || uuidv4(),
    name: params.fileName,
    size: params.file.size,
    type: params.contentType,
    path: filePath,
    url,
    bucket,
    createdAt: new Date(),
    updatedBy: params.userId,
    organizationId: params.organizationId,
  };

  return fileMetadata;
}

export async function downloadFile(
  fileId: string,
  bucket: StorageBucket
): Promise<Blob | null> {
  const supabase = createClient();
  const { data, error } = await supabase.storage.from(bucket).download(fileId);

  if (error || !data) {
    console.error("Error downloading file:", error);
    return null;
  }

  return data;
}

export async function getFileUrl(
  fileId: string,
  bucket: StorageBucket
): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(fileId, 60 * 60 * 24); // 24 hours

  if (error || !data) {
    console.error("Error getting file URL:", error);
    return null;
  }

  return data.signedUrl;
}

export async function deleteFile(
  fileId: string,
  bucket: StorageBucket
): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.storage.from(bucket).remove([fileId]);

  if (error) {
    console.error("Error deleting file:", error);
    return false;
  }

  return true;
}

export async function listFiles(
  params: ListFilesParams
): Promise<FileMetadata[]> {
  if (!params.userId) {
    throw new Error("User authentication required");
  }

  const supabase = createClient();
  const bucket = params.bucket || (STORAGE_BUCKETS.PRIVATE as StorageBucket);
  let path = "";

  if (params.organizationId) {
    path = `organizations/${params.organizationId}`;
  } else {
    path = `users/${params.userId}`;
  }

  if (params.path) {
    path = `${path}/${params.path}`;
  }

  const { data, error } = await supabase.storage.from(bucket).list(path, {
    limit: params.limit || 100,
    offset: params.offset || 0,
    sortBy: { column: "name", order: "asc" },
  });

  if (error) {
    console.error("Error listing files:", error);
    throw new Error(`Failed to list files: ${error.message}`);
  }

  if (!data) {
    return [];
  }

  // Transform the response to our FileMetadata format
  const fileMetadata: FileMetadata[] = await Promise.all(
    data.map(async (item) => {
      const fullPath = path ? `${path}/${item.name}` : item.name;
      const { data: urlData } = await supabase.storage
        .from(bucket)
        .createSignedUrl(fullPath, 60 * 60 * 24); // 24 hours

      const url = urlData?.signedUrl || "";
      const idPart = item.name.split("-")[0];

      return {
        id: idPart,
        name: item.name.substring(idPart.length + 1),
        size: item.metadata?.size || 0,
        type: item.metadata?.mimetype || "",
        path: fullPath,
        url,
        bucket: bucket as StorageBucket,
        createdAt: new Date(item.created_at || ""),
        updatedBy: params.userId,
        organizationId: params.organizationId,
      };
    })
  );

  return fileMetadata;
}

// Helper function
function generateFilePath(params: UploadParams): string {
  const { userId, organizationId, path, fileName } = params;
  const fileId = uuidv4();

  let filePath = "";

  if (organizationId) {
    filePath = `organizations/${organizationId}`;
  } else {
    filePath = `users/${userId}`;
  }

  if (path) {
    filePath = `${filePath}/${path}`;
  }

  // Add file id to ensure uniqueness
  const fileNameWithId = `${fileId}-${fileName}`;

  return `${filePath}/${fileNameWithId}`;
}
