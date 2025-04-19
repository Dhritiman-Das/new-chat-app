# File Storage Module

This module provides a flexible and secure file storage solution for the application. It currently uses Supabase Storage as the backend, but is designed with an abstraction layer that allows for easy substitution with other storage providers in the future.

## Features

- Upload files with proper authentication
- Download files
- Generate secure URLs for file access
- Delete files
- List files with filtering options
- Organization and user-based file organization
- Bucket-based storage separation (public, private, temporary)

## Architecture

The file storage module consists of:

1. **Storage Provider Interface**: A TypeScript interface (`FileStorageProvider`) that defines the contract for any storage provider implementation.
2. **Supabase Storage Implementation**: The current implementation using Supabase Storage.
3. **Client Abstraction**: A `StorageClient` class that implements the `FileStorageProvider` interface and forwards calls to the server functions.
4. **Server Actions**: Implementation of storage operations as server actions for secure file handling.

## Usage

### Enable RLS on Supabase

```sql
-- Enable row-level security
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy for SELECT operations
CREATE POLICY objects_select_policy ON storage.objects FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy for INSERT operations WITH CHECK !
CREATE POLICY objects_insert_policy ON storage.objects FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Policy for UPDATE operations
CREATE POLICY objects_update_policy ON storage.objects FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Policy for DELETE operations
CREATE POLICY objects_delete_policy ON storage.objects FOR DELETE
  USING (auth.role() = 'authenticated');
```

### Server-side

```typescript
import { storage } from "@/lib/storage/client";
import { STORAGE_BUCKETS } from "@/lib/storage/types";

// Upload a file
const fileMetadata = await storage.upload({
  file: fileBlob,
  fileName: "document.pdf",
  contentType: "application/pdf",
  userId: currentUser.id,
  organizationId: organization.id, // Optional
  bucket: STORAGE_BUCKETS.PRIVATE, // Optional, defaults to PRIVATE
  path: "documents/contracts", // Optional subfolder
  metadata: { category: "contract" }, // Optional metadata
});

// Get a file URL
const url = await storage.getFileUrl(fileId, STORAGE_BUCKETS.PRIVATE);

// Download a file
const blob = await storage.download(fileId, STORAGE_BUCKETS.PRIVATE);

// Delete a file
const success = await storage.delete(fileId, STORAGE_BUCKETS.PRIVATE);

// List files
const files = await storage.listFiles({
  userId: currentUser.id,
  organizationId: organization.id, // Optional
  bucket: STORAGE_BUCKETS.PRIVATE, // Optional
  path: "documents", // Optional
  limit: 50, // Optional
  offset: 0, // Optional
});
```

### Client-side

Import the server functions directly to use them from client components:

```typescript
import {
  uploadFile,
  downloadFile,
  getFileUrl,
  deleteFile,
  listFiles,
} from "@/lib/storage";
import { STORAGE_BUCKETS } from "@/lib/storage/types";

// Upload a file
const result = await uploadFile({
  file: fileBlob,
  fileName: "document.pdf",
  contentType: "application/pdf",
  userId: currentUser.id,
  bucket: STORAGE_BUCKETS.PRIVATE,
});

// Download a file
const blob = await downloadFile(fileId, STORAGE_BUCKETS.PRIVATE);

// Get a file URL
const url = await getFileUrl(fileId, STORAGE_BUCKETS.PRIVATE);

// Delete a file
const success = await deleteFile(fileId, STORAGE_BUCKETS.PRIVATE);

// List files
const files = await listFiles({
  userId: currentUser.id,
  bucket: STORAGE_BUCKETS.PRIVATE,
  path: "documents",
});
```

## File Paths and Organization

Files are organized in the following structure:

- For organization files: `organizations/{organizationId}/{optional-path}/{fileId}-{fileName}`
- For user files: `users/{userId}/{optional-path}/{fileId}-{fileName}`

The `fileId` is automatically generated as a UUID to ensure uniqueness.

## Configuration

### Environment Variables

Make sure to set these environment variables:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Supabase Storage Setup

1. Create the following buckets in your Supabase project:

   - `public-bucket`: For publicly accessible files
   - `private-bucket`: For authenticated user files
   - `temp-bucket`: For temporary files that can be deleted periodically

2. Configure appropriate bucket policies:
   - `public-bucket`: Allow read for everyone, write for authenticated users
   - `private-bucket`: Restrict both read and write to authenticated users
   - `temp-bucket`: Similar to private, but with shorter retention period

## Extending

### Adding a New Storage Provider

1. Create a new class that implements the `FileStorageProvider` interface
2. Implement all required methods
3. Update the exported `storage` constant to use your new provider

Example:

```typescript
import { FileStorageProvider } from "./types";

export class S3FileStorage implements FileStorageProvider {
  // Implement all the required methods
}

// Switch providers by updating the client.ts file
export const storage = new S3FileStorage();
```

## Security Considerations

- All storage operations require authentication
- Files are organized by user and organization
- File paths include a UUID to prevent enumeration attacks
- URLs are signed with expiration times (24 hours by default for most operations)
- Bucket permissions are enforced by Supabase policies
