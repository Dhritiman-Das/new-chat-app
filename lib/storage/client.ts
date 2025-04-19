import {
  downloadFile,
  uploadFile,
  getFileUrl,
  deleteFile,
  listFiles,
} from "./index";
import type {
  FileMetadata,
  FileStorageProvider,
  ListFilesParams,
  StorageBucket,
  UploadParams,
} from "./types";

export class StorageClient implements FileStorageProvider {
  async upload(params: UploadParams): Promise<FileMetadata> {
    return uploadFile(params);
  }

  async download(fileId: string, bucket: StorageBucket): Promise<Blob | null> {
    return downloadFile(fileId, bucket);
  }

  async getFileUrl(
    fileId: string,
    bucket: StorageBucket
  ): Promise<string | null> {
    return getFileUrl(fileId, bucket);
  }

  async delete(fileId: string, bucket: StorageBucket): Promise<boolean> {
    return deleteFile(fileId, bucket);
  }

  async listFiles(params: ListFilesParams): Promise<FileMetadata[]> {
    return listFiles(params);
  }
}

// Export a singleton instance
export const storage = new StorageClient();
