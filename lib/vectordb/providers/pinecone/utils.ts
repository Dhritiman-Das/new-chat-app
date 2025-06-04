import {
  Index,
  RecordMetadata,
  PineconeRecord,
} from "@pinecone-database/pinecone";
import { chunkArray } from "../../utils";

/**
 * Calculate optimal batch size based on vector dimensions and metadata size
 * Based on Pinecone documentation limits:
 * - Max 2MB per request
 * - Max 1000 records with vectors
 * - For 1536 dimensions with 2000 bytes metadata: ~245 records max
 */
function calculateOptimalBatchSize(
  dimensions: number,
  avgMetadataBytes: number = 2000
): number {
  // Conservative estimate: each float32 = 4 bytes, plus metadata
  const bytesPerRecord = dimensions * 4 + avgMetadataBytes + 100; // 100 bytes overhead
  const maxRecordsBySize = Math.floor((2 * 1024 * 1024) / bytesPerRecord); // 2MB limit

  // Return the smaller of calculated size or 1000 (Pinecone's hard limit)
  return Math.min(maxRecordsBySize, 1000);
}

/**
 * Delay function for exponential backoff
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry function with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }

      const delayTime = baseDelay * Math.pow(2, attempt);
      console.warn(
        `Attempt ${attempt + 1} failed, retrying in ${delayTime}ms...`,
        error
      );
      await delay(delayTime);
    }
  }
  throw new Error("Unexpected error in retry logic");
}

/**
 * Upsert vectors in chunks to Pinecone with optimized batching and parallel processing
 * @param index - The Pinecone index
 * @param records - The records to upsert
 * @param namespace - The namespace to upsert to
 * @param chunkSize - The size of each chunk (optional, will calculate optimal if not provided)
 * @param dimensions - Vector dimensions for batch size calculation
 * @param maxConcurrency - Maximum number of parallel requests (default: 10)
 * @returns A promise that resolves to true if successful
 */
export async function chunkedUpsert(
  index: Index<RecordMetadata>,
  records: PineconeRecord<RecordMetadata>[],
  namespace: string,
  chunkSize?: number,
  dimensions: number = 1536,
  maxConcurrency: number = 10
): Promise<boolean> {
  // Calculate optimal batch size if not provided
  const optimalChunkSize = chunkSize || calculateOptimalBatchSize(dimensions);

  console.log(
    `Upserting ${records.length} records in chunks of ${optimalChunkSize} with ${maxConcurrency} concurrent requests`
  );

  // Split the vectors into chunks
  const chunks = chunkArray(records, optimalChunkSize);

  try {
    // Process chunks in batches with controlled concurrency
    for (let i = 0; i < chunks.length; i += maxConcurrency) {
      const batch = chunks.slice(i, i + maxConcurrency);

      const batchPromises = batch.map(async (chunk, chunkIndex) => {
        const actualIndex = i + chunkIndex;

        return retryWithBackoff(async () => {
          const namespaceIndex = index.namespace(namespace);
          await namespaceIndex.upsert(chunk);
          console.log(`✓ Completed chunk ${actualIndex + 1}/${chunks.length}`);
        });
      });

      // Wait for this batch to complete before starting the next
      await Promise.all(batchPromises);
    }

    console.log(`✓ Successfully upserted all ${records.length} records`);
    return true;
  } catch (error) {
    console.error("Error in chunkedUpsert:", error);
    throw new Error(
      `Failed to upsert chunk: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * High-throughput parallel upsert with full parallelization
 * Use this for maximum speed when you have good rate limits
 * @param index - The Pinecone index
 * @param records - The records to upsert
 * @param namespace - The namespace to upsert to
 * @param chunkSize - The size of each chunk
 * @param dimensions - Vector dimensions for batch size calculation
 * @returns A promise that resolves to true if successful
 */
export async function parallelUpsert(
  index: Index<RecordMetadata>,
  records: PineconeRecord<RecordMetadata>[],
  namespace: string,
  chunkSize?: number,
  dimensions: number = 1536
): Promise<boolean> {
  // Calculate optimal batch size if not provided
  const optimalChunkSize = chunkSize || calculateOptimalBatchSize(dimensions);

  console.log(
    `Parallel upserting ${records.length} records in chunks of ${optimalChunkSize}`
  );

  // Split the vectors into chunks
  const chunks = chunkArray(records, optimalChunkSize);

  try {
    // Process all chunks in parallel with retry logic
    await Promise.all(
      chunks.map((chunk, i) =>
        retryWithBackoff(async () => {
          const namespaceIndex = index.namespace(namespace);
          await namespaceIndex.upsert(chunk);
          console.log(`✓ Completed chunk ${i + 1}/${chunks.length}`);
        })
      )
    );

    console.log(
      `✓ Successfully upserted all ${records.length} records in parallel`
    );
    return true;
  } catch (error) {
    console.error("Error in parallelUpsert:", error);
    throw new Error(
      `Failed to upsert chunk: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Delete records from Pinecone based on filter
 * @param index - The Pinecone index
 * @param namespace - The namespace to delete from
 * @param filter - The filter to apply
 * @returns A promise that resolves when complete
 */
export async function deleteRecords(
  index: Index<RecordMetadata>,
  namespace: string,
  filter: Record<string, unknown>
): Promise<void> {
  try {
    const namespaceIndex = index.namespace(namespace);
    await namespaceIndex.deleteMany({ filter });
  } catch (error) {
    console.error("Error deleting records:", error);
    throw new Error(
      `Failed to delete records: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Delete records from Pinecone based on a list of accountIds
 * @param index - The Pinecone index
 * @param namespace - The namespace to delete from
 * @param accountIds - An array of accountId strings to delete
 * @returns A promise that resolves when complete
 */
export async function deleteRecordsByAccountIds(
  index: Index<RecordMetadata>,
  namespace: string,
  accountIds: string[]
): Promise<void> {
  if (!accountIds || accountIds.length === 0) {
    return;
  }

  try {
    const namespaceIndex = index.namespace(namespace);
    await namespaceIndex.deleteMany({
      filter: {
        accountId: { $in: accountIds },
      },
    });
  } catch (error) {
    console.error("Error deleting records by accountIds:", error);
    throw new Error(
      `Failed to delete records by accountIds: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
