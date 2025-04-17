import {
  Index,
  RecordMetadata,
  PineconeRecord,
} from "@pinecone-database/pinecone";
import { chunkArray } from "../../utils";

/**
 * Upsert vectors in chunks to Pinecone
 * @param index - The Pinecone index
 * @param records - The records to upsert
 * @param namespace - The namespace to upsert to
 * @param chunkSize - The size of each chunk
 * @returns A promise that resolves to true if successful
 */
export async function chunkedUpsert(
  index: Index<RecordMetadata>,
  records: PineconeRecord<RecordMetadata>[],
  namespace: string,
  chunkSize = 100
): Promise<boolean> {
  // Split the vectors into chunks
  const chunks = chunkArray(records, chunkSize);

  try {
    // Upsert each chunk of vectors into the index
    await Promise.allSettled(
      chunks.map(async (chunk, i) => {
        try {
          // The exact syntax may depend on pinecone version
          // Access the namespace from the index
          const namespaceIndex = index.namespace(namespace);
          await namespaceIndex.upsert(chunk);
        } catch (error) {
          console.error(`Error upserting chunk ${i}:`, error);
          throw error;
        }
      })
    );

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
