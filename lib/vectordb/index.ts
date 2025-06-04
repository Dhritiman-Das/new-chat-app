import {
  AdditionalMetadata,
  QueryResult,
  VectorDbConfig,
  VectorDbFilter,
  VectorDbResponse,
} from "./types";
import { env } from "@/src/env";

/**
 * Interface for vector database services
 */
export interface VectorDbService {
  /**
   * Initialize the vector database
   */
  initialize(): Promise<void>;

  /**
   * Query the vector database
   * @param filter - Filter to apply to the query
   * @param text - Text to query for similar vectors
   * @param topK - Number of results to return
   *
   * TODO: Enhancement - Update this interface to return full match data including metadata
   * Return interface should include:
   * - text: The matched content
   * - metadata: Record with documentId and other metadata
   * - score: The relevance score
   */
  query(
    filter: VectorDbFilter,
    text: string,
    topK?: number
  ): Promise<QueryResult[]>;

  /**
   * Upsert data into the vector database
   * @param additionalMetadata - Additional metadata to store with the vectors
   * @param text - Text to embed and store
   */
  upsert(
    additionalMetadata: AdditionalMetadata,
    text: string
  ): Promise<VectorDbResponse>;

  /**
   * High-performance batch upsert for multiple texts
   * @param textEntries - Array of objects containing text and metadata
   * @param useParallelUpsert - Whether to use full parallelization for maximum speed
   */
  batchUpsert(
    textEntries: Array<{
      text: string;
      additionalMetadata: AdditionalMetadata;
    }>,
    useParallelUpsert?: boolean
  ): Promise<VectorDbResponse>;

  /**
   * Delete records by account IDs
   * @param accountIds - Account IDs to delete records for
   */
  deleteByAccountIds(accountIds: string[]): Promise<VectorDbResponse>;

  /**
   * Delete records by filter
   * @param filter - Filter to apply for deletion
   */
  deleteByFilter(filter: VectorDbFilter): Promise<VectorDbResponse>;

  /**
   * Fetch vector records directly by their IDs
   * @param ids - Array of record IDs to retrieve
   * @returns A promise that resolves to the fetched records
   */
  fetchRecordsByIds(ids: string[]): Promise<VectorDbResponse>;
}

/**
 * Factory for creating vector database instances
 */
export class VectorDbFactory {
  /**
   * Create a vector database instance
   * @param provider - The vector database provider to use
   * @param config - Configuration for the vector database
   * @returns A VectorDbService instance
   */
  static async create(
    provider: string,
    config?: Partial<VectorDbConfig>
  ): Promise<VectorDbService> {
    switch (provider.toLowerCase()) {
      case "pinecone": {
        const { PineconeVectorDb } = await import("./providers/pinecone");
        return new PineconeVectorDb(config);
      }
      // Add more providers here as needed
      default:
        throw new Error(`Vector database provider ${provider} not supported`);
    }
  }
}

// Default vector database instance (lazy loaded)
let defaultVectorDb: VectorDbService | null = null;

/**
 * Get the default vector database instance
 * Uses the VECTOR_DB_PROVIDER environment variable or falls back to "pinecone"
 * @param config - Optional configuration to override defaults
 * @returns A promise that resolves to a VectorDbService instance
 */
export async function getVectorDb(
  config?: Partial<VectorDbConfig>
): Promise<VectorDbService> {
  if (!defaultVectorDb) {
    const provider = env.VECTOR_DB_PROVIDER;
    defaultVectorDb = await VectorDbFactory.create(provider, config);
    await defaultVectorDb.initialize();
  }
  return defaultVectorDb;
}
