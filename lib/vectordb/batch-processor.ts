import { getVectorDb } from "./index";
import { AdditionalMetadata, VectorDbResponse } from "./types";

/**
 * Type for items that can be processed - either strings or objects with text content
 */
export type ProcessableItem =
  | string
  | { text?: string; [key: string]: unknown };

/**
 * Configuration for batch processing
 */
export interface BatchProcessingConfig {
  /**
   * Maximum number of texts to process in a single batch
   * Larger batches are more efficient but use more memory
   */
  batchSize?: number;

  /**
   * Whether to use parallel upsert for maximum speed
   * Set to false if you're hitting rate limits
   */
  useParallelUpsert?: boolean;

  /**
   * Maximum concurrent batches to process
   * Helps prevent overwhelming the system
   */
  maxConcurrentBatches?: number;

  /**
   * Function to extract metadata from each item
   */
  getMetadata?: (item: ProcessableItem, index: number) => AdditionalMetadata;

  /**
   * Function to extract text content from each item
   */
  getTextContent?: (item: ProcessableItem, index: number) => string;
}

/**
 * High-performance batch processor for vector database operations
 */
export class VectorDbBatchProcessor {
  private config: Required<BatchProcessingConfig>;

  constructor(config: BatchProcessingConfig = {}) {
    this.config = {
      batchSize: 50, // Process 50 texts at a time
      useParallelUpsert: false, // Conservative default
      maxConcurrentBatches: 3, // Limit concurrent batches
      getMetadata: (item, index) =>
        ({
          // Return an object that extends AdditionalMetadata
          agentId: undefined,
          botId: undefined,
          documentId: undefined,
          accountId: undefined,
          namespace: undefined,
          timestamp: new Date().toISOString(),
          sourceUrl: undefined,
          sourceType: undefined,
          pageTitle: undefined,
          // Add custom itemIndex as additional property
          itemIndex: index,
        } as AdditionalMetadata & { itemIndex: number }),
      getTextContent: (item) =>
        typeof item === "string"
          ? item
          : (item as { text?: string }).text || String(item),
      ...config,
    };
  }

  /**
   * Process an array of texts with optimal batching
   * @param texts - Array of texts or objects containing text
   * @param baseMetadata - Base metadata to apply to all items
   * @returns Promise that resolves to processing results
   */
  async processTexts(
    texts: ProcessableItem[],
    baseMetadata: AdditionalMetadata = {}
  ): Promise<{
    success: boolean;
    totalRecords: number;
    batchResults: VectorDbResponse[];
    errors: Error[];
  }> {
    const vectorDb = await getVectorDb();
    const batchResults: VectorDbResponse[] = [];
    const errors: Error[] = [];
    let totalRecords = 0;

    console.log(`Starting batch processing of ${texts.length} texts...`);
    console.log(
      `Configuration: batchSize=${this.config.batchSize}, parallel=${this.config.useParallelUpsert}`
    );

    // Split texts into batches
    const batches = this.chunkArray(texts, this.config.batchSize);

    // Process batches with controlled concurrency
    for (let i = 0; i < batches.length; i += this.config.maxConcurrentBatches) {
      const batchGroup = batches.slice(i, i + this.config.maxConcurrentBatches);

      const batchPromises = batchGroup.map(async (batch, batchIndex) => {
        const actualBatchIndex = i + batchIndex;

        try {
          console.log(
            `Processing batch ${actualBatchIndex + 1}/${batches.length} (${
              batch.length
            } items)...`
          );

          // Prepare batch entries
          const batchEntries = batch.map((item, itemIndex) => ({
            text: this.config.getTextContent(item, itemIndex),
            additionalMetadata: {
              ...baseMetadata,
              ...this.config.getMetadata(item, itemIndex),
              batchIndex: actualBatchIndex,
            },
          }));

          // Process the batch
          const result = await vectorDb.batchUpsert(
            batchEntries,
            this.config.useParallelUpsert
          );

          if (
            result.success &&
            result.data &&
            typeof result.data === "object"
          ) {
            const data = result.data as { recordCount?: number };
            if (data.recordCount) {
              totalRecords += data.recordCount;
            }
          }

          const recordCount =
            result.data && typeof result.data === "object"
              ? (result.data as { recordCount?: number }).recordCount || 0
              : 0;
          console.log(
            `✓ Batch ${actualBatchIndex + 1} completed: ${recordCount} records`
          );
          return result;
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          console.error(`✗ Batch ${actualBatchIndex + 1} failed:`, err.message);
          errors.push(err);

          return {
            success: false,
            error: err,
          } as VectorDbResponse;
        }
      });

      // Wait for this batch group to complete
      const groupResults = await Promise.all(batchPromises);
      batchResults.push(...groupResults);
    }

    const successfulBatches = batchResults.filter(
      (result) => result.success
    ).length;

    console.log(`\n✓ Batch processing completed:`);
    console.log(`  - Total texts processed: ${texts.length}`);
    console.log(`  - Total records created: ${totalRecords}`);
    console.log(
      `  - Successful batches: ${successfulBatches}/${batches.length}`
    );
    console.log(`  - Errors: ${errors.length}`);

    return {
      success: errors.length === 0,
      totalRecords,
      batchResults,
      errors,
    };
  }

  /**
   * Process files from file paths or file objects
   * @param files - Array of file paths, File objects, or objects with text content
   * @param baseMetadata - Base metadata to apply to all files
   * @returns Promise that resolves to processing results
   */
  async processFiles(
    files: Array<string | File | { content: string; filename?: string }>,
    baseMetadata: AdditionalMetadata = {}
  ): Promise<{
    success: boolean;
    totalRecords: number;
    batchResults: VectorDbResponse[];
    errors: Error[];
  }> {
    console.log(`Preparing to process ${files.length} files...`);

    // Convert files to text content
    const textItems = await Promise.all(
      files.map(async (file, index) => {
        try {
          let content: string;
          let filename: string;

          if (typeof file === "string") {
            // File path - you'd need to implement file reading here
            throw new Error(
              "File path processing not implemented. Please provide File objects or content directly."
            );
          } else if (file instanceof File) {
            content = await file.text();
            filename = file.name;
          } else {
            content = file.content;
            filename = file.filename || `file_${index}`;
          }

          return {
            content,
            filename,
            originalIndex: index,
          };
        } catch (error) {
          console.error(`Error processing file ${index}:`, error);
          throw error;
        }
      })
    );

    // Use custom metadata and text extraction for files
    const fileProcessor = new VectorDbBatchProcessor({
      ...this.config,
      getMetadata: (item, index) => ({
        ...baseMetadata,
        filename: (item as { filename: string }).filename,
        originalFileIndex: (item as { originalIndex: number }).originalIndex,
        itemIndex: index,
      }),
      getTextContent: (item) => (item as { content: string }).content,
    });

    return fileProcessor.processTexts(textItems, baseMetadata);
  }

  /**
   * Utility method to chunk an array into smaller arrays
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}

/**
 * Convenience function to create and use a batch processor
 * @param texts - Array of texts to process
 * @param baseMetadata - Base metadata for all texts
 * @param config - Configuration for batch processing
 * @returns Promise that resolves to processing results
 */
export async function batchProcessTexts(
  texts: ProcessableItem[],
  baseMetadata: AdditionalMetadata = {},
  config: BatchProcessingConfig = {}
) {
  const processor = new VectorDbBatchProcessor(config);
  return processor.processTexts(texts, baseMetadata);
}

/**
 * Convenience function to batch process files
 * @param files - Array of files to process
 * @param baseMetadata - Base metadata for all files
 * @param config - Configuration for batch processing
 * @returns Promise that resolves to processing results
 */
export async function batchProcessFiles(
  files: Array<string | File | { content: string; filename?: string }>,
  baseMetadata: AdditionalMetadata = {},
  config: BatchProcessingConfig = {}
) {
  const processor = new VectorDbBatchProcessor(config);
  return processor.processFiles(files, baseMetadata);
}
