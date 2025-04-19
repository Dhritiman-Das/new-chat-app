// lib/storage/types.ts
export const STORAGE_BUCKETS = {
  PUBLIC: "public-bucket",
  PRIVATE: "private-bucket",
  TEMPORARY: "temp-bucket",
} as const;

export type StorageBucket = keyof typeof STORAGE_BUCKETS;

export interface FileMetadata {
  id: string;
  name: string;
  size: number;
  type: string;
  path: string;
  url: string;
  bucket: StorageBucket;
  createdAt: Date;
  updatedBy: string;
  organizationId?: string;
}

export interface FileStorageProvider {
  upload(params: UploadParams): Promise<FileMetadata>;
  download(fileId: string, bucket: StorageBucket): Promise<Blob | null>;
  getFileUrl(fileId: string, bucket: StorageBucket): Promise<string | null>;
  delete(fileId: string, bucket: StorageBucket): Promise<boolean>;
  listFiles(params: ListFilesParams): Promise<FileMetadata[]>;
}

export interface UploadParams {
  file: File | Blob;
  fileName: string;
  contentType: string;
  userId: string;
  organizationId?: string;
  bucket?: StorageBucket;
  path?: string;
  metadata?: Record<string, string>;
}

export interface ListFilesParams {
  userId: string;
  organizationId?: string;
  bucket?: StorageBucket;
  path?: string;
  limit?: number;
  offset?: number;
}
