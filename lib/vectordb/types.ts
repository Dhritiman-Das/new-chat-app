import { z } from "zod";

/**
 * Base metadata schema that all vector stores must support
 */
export const BaseMetadataSchema = z.object({
  chunk: z.string(),
  hash: z.string(),
});

export type BaseMetadata = z.infer<typeof BaseMetadataSchema>;

/**
 * Additional metadata that can be added to vector records
 */
export const AdditionalMetadataSchema = z
  .object({
    agentId: z.string().optional(),
    botId: z.string().optional(),
    documentId: z.string().optional(),
    accountId: z.string().optional(),
    namespace: z.string().optional(),
    timestamp: z.string().optional(),
    // Website source related fields
    sourceUrl: z.string().optional(),
    sourceType: z.string().optional(),
    pageTitle: z.string().optional(),
    // Add more fields as needed
  })
  .partial();

export type AdditionalMetadata = z.infer<typeof AdditionalMetadataSchema>;

/**
 * Combined metadata type for vector records
 */
export type Metadata = BaseMetadata & AdditionalMetadata;

/**
 * Filter for querying vectors
 */
export type VectorDbFilter = Record<string, unknown>;

/**
 * Interface for a Document
 */
export interface Document {
  pageContent: string;
  metadata: Record<string, unknown>;
}

/**
 * Configuration for a vector database
 */
export interface VectorDbConfig {
  indexName: string;
  namespace: string;
  dimensions: number;
  chunkSize?: number;
  chunkOverlap?: number;
  upsertBatchSize?: number;
  topK?: number;
  minScore?: number;
}

/**
 * Response type for vector database operations
 */
export interface VectorDbResponse {
  success: boolean;
  data?: unknown;
  error?: Error | string;
}

export interface QueryResult {
  chunk: string;
  metadata: Metadata;
  score?: number;
}
