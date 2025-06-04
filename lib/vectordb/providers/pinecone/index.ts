import {
  Pinecone,
  Index,
  RecordMetadata,
  PineconeRecord,
  ServerlessSpec,
} from "@pinecone-database/pinecone";
import md5 from "md5";
import { RecursiveCharacterTextSplitter } from "@pinecone-database/doc-splitter";

import {
  AdditionalMetadata,
  Document,
  Metadata,
  QueryResult,
  VectorDbConfig,
  VectorDbFilter,
  VectorDbResponse,
} from "../../types";
import { getEmbeddings, getBatchEmbeddings } from "../../embedding";
import { truncateStringByBytes } from "../../utils";
import * as pineconeUtils from "./utils";
import { VectorDbService } from "../..";
import { env } from "@/src/env";

// Default namespace
enum Namespace {
  default = "default",
}

export class PineconeVectorDb implements VectorDbService {
  private pinecone: Pinecone;
  private index: Index<RecordMetadata> | null = null;
  private config: VectorDbConfig;

  constructor(config: Partial<VectorDbConfig> = {}) {
    // Default configuration
    this.config = {
      indexName: env.PINECONE_INDEX,
      namespace: Namespace.default,
      dimensions: 1536, // OpenAI embedding dimensions
      chunkSize: 500,
      chunkOverlap: 20,
      upsertBatchSize: 100,
      topK: 5,
      minScore: 0.5,
      ...config,
    };

    // Initialize Pinecone client
    this.pinecone = new Pinecone({
      apiKey: env.PINECONE_API_KEY,
    });
  }

  /**
   * Initialize the Pinecone index
   */
  async initialize(): Promise<void> {
    try {
      // Check if index exists
      const indexes = await this.pinecone.listIndexes();
      const indexExists =
        indexes.indexes?.some(
          (index) => index.name === this.config.indexName
        ) || false;

      if (!indexExists) {
        await this.createIndex();
      }

      // Connect to the index
      this.index = this.pinecone.index<RecordMetadata>(this.config.indexName);
    } catch (error) {
      console.error("Error initializing Pinecone:", error);
      throw new Error(
        `Failed to initialize Pinecone: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Create a new Pinecone index
   */
  private async createIndex(): Promise<void> {
    try {
      await this.pinecone.createIndex({
        name: this.config.indexName,
        dimension: this.config.dimensions,
        metric: "cosine",
        spec: {
          serverless: {
            cloud: "aws",
            region: "us-east-1",
          } as ServerlessSpec,
        },
      });

      // Wait for index to be ready
      console.log(`Waiting for index ${this.config.indexName} to be ready...`);
      let isIndexReady = false;
      while (!isIndexReady) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        const indexes = await this.pinecone.listIndexes();
        const index = indexes.indexes?.find(
          (idx) => idx.name === this.config.indexName
        );
        isIndexReady = index?.status?.state === "Ready";
      }
      console.log(`Index ${this.config.indexName} is ready`);
    } catch (error) {
      console.error("Error creating Pinecone index:", error);
      throw new Error(
        `Failed to create Pinecone index: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Query the vector database
   * @param filter - The filter to apply to the query
   * @param text - The text to find similar vectors for
   * @param topK - The number of results to return
   * @returns A promise that resolves to an array of strings
   */
  async query(
    filter: VectorDbFilter,
    text: string,
    topK: number = this.config.topK || 5
  ): Promise<QueryResult[]> {
    if (!this.index) {
      await this.initialize();
    }

    try {
      // Generate embeddings for the query
      const embeddings = await getEmbeddings(text);

      // Get the namespace-specific index
      const namespaceIndex = this.index!.namespace(this.config.namespace);

      // Query the index
      const queryResponse = await namespaceIndex.query({
        vector: embeddings,
        topK,
        includeMetadata: true,
        filter,
      });

      // Extract and filter results
      const matches = queryResponse.matches || [];
      const qualifyingDocs = matches.filter(
        (match) => match.score && match.score > (this.config.minScore || 0.6)
      );

      // Extract the chunks from the metadata
      return qualifyingDocs.map((match) => ({
        id: match.id,
        chunk: match.metadata?.chunk as string,
        metadata: match.metadata as Metadata,
        score: match.score,
      }));
    } catch (error) {
      console.error("Error querying Pinecone:", error);
      throw new Error(
        `Failed to query Pinecone: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Upsert data into the vector database
   * @param additionalMetadata - Additional metadata to include with the vectors
   * @param text - The text to embed and store
   * @returns A promise that resolves to a VectorDbResponse
   */
  async upsert(
    additionalMetadata: AdditionalMetadata,
    text: string
  ): Promise<VectorDbResponse> {
    if (!this.index) {
      await this.initialize();
    }

    try {
      // Split the text into chunks
      const documents = await this.prepareDocument(text, additionalMetadata);

      // Create vectors for each document using batch embedding generation
      const records = await this.createPineconeRecordsBatch(
        documents,
        additionalMetadata
      );

      // Upsert the vectors using optimized batch processing
      await pineconeUtils.chunkedUpsert(
        this.index!,
        records,
        this.config.namespace,
        undefined, // Let it calculate optimal batch size
        this.config.dimensions
      );

      return {
        success: true,
        data: {
          recordCount: records.length,
          namespace: this.config.namespace,
        },
      };
    } catch (error) {
      console.error("Error upserting to Pinecone:", error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * High-performance batch upsert for multiple texts
   * Use this when you need to process many files or texts simultaneously
   * @param textEntries - Array of objects containing text and metadata
   * @param useParallelUpsert - Whether to use full parallelization (default: false for rate limit safety)
   * @returns A promise that resolves to a VectorDbResponse
   */
  async batchUpsert(
    textEntries: Array<{
      text: string;
      additionalMetadata: AdditionalMetadata;
    }>,
    useParallelUpsert: boolean = false
  ): Promise<VectorDbResponse> {
    if (!this.index) {
      await this.initialize();
    }

    try {
      console.log(`Starting batch upsert for ${textEntries.length} texts...`);

      // Process all texts to create documents
      const allDocuments: Array<{
        doc: Document;
        metadata: AdditionalMetadata;
      }> = [];

      for (const entry of textEntries) {
        const documents = await this.prepareDocument(
          entry.text,
          entry.additionalMetadata
        );
        documents.forEach((doc) => {
          allDocuments.push({ doc, metadata: entry.additionalMetadata });
        });
      }

      console.log(
        `Prepared ${allDocuments.length} document chunks from ${textEntries.length} texts`
      );

      // Create all records using batch embedding generation
      const allTexts = allDocuments.map((item) => item.doc.pageContent);
      const embeddings = await getBatchEmbeddings(allTexts);

      const records: PineconeRecord<RecordMetadata>[] = allDocuments.map(
        (item, index) => {
          const hash = item.doc.metadata.hash || md5(item.doc.pageContent);
          const metadata: Metadata = {
            chunk: item.doc.pageContent,
            hash: hash as string,
            ...item.metadata,
          };

          return {
            id: hash as string,
            values: embeddings[index],
            metadata: metadata as RecordMetadata,
          };
        }
      );

      // Choose upsert strategy based on performance requirements
      if (useParallelUpsert) {
        console.log("Using parallel upsert for maximum speed...");
        await pineconeUtils.parallelUpsert(
          this.index!,
          records,
          this.config.namespace,
          undefined,
          this.config.dimensions
        );
      } else {
        console.log("Using controlled concurrency upsert...");
        await pineconeUtils.chunkedUpsert(
          this.index!,
          records,
          this.config.namespace,
          undefined,
          this.config.dimensions
        );
      }

      return {
        success: true,
        data: {
          recordCount: records.length,
          namespace: this.config.namespace,
          textCount: textEntries.length,
        },
      };
    } catch (error) {
      console.error("Error in batch upsert to Pinecone:", error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Delete records by account IDs
   * @param accountIds - The account IDs to delete records for
   * @returns A promise that resolves to a VectorDbResponse
   */
  async deleteByAccountIds(accountIds: string[]): Promise<VectorDbResponse> {
    if (!this.index) {
      await this.initialize();
    }

    try {
      await pineconeUtils.deleteRecordsByAccountIds(
        this.index!,
        this.config.namespace,
        accountIds
      );

      return { success: true };
    } catch (error) {
      console.error("Error deleting records from Pinecone:", error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Delete records by filter
   * @param filter - The filter to apply
   * @returns A promise that resolves to a VectorDbResponse
   */
  async deleteByFilter(filter: VectorDbFilter): Promise<VectorDbResponse> {
    if (!this.index) {
      await this.initialize();
    }

    try {
      await pineconeUtils.deleteRecords(
        this.index!,
        this.config.namespace,
        filter
      );

      return { success: true };
    } catch (error) {
      console.error("Error deleting records from Pinecone:", error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Prepare a document for Pinecone
   * @param text - The text to prepare
   * @param additionalMetadata - Additional metadata to include
   * @returns A promise that resolves to an array of Document objects
   */
  private async prepareDocument(
    text: string,
    additionalMetadata: AdditionalMetadata
  ): Promise<Document[]> {
    // Split the text into chunks
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: this.config.chunkSize,
      chunkOverlap: this.config.chunkOverlap,
    });

    const docs = await splitter.splitDocuments([
      {
        pageContent: text,
        metadata: {
          text: truncateStringByBytes(text, 36000),
        },
      },
    ]);

    // Add hash to each document
    return docs.map(
      (doc): Document => ({
        pageContent: doc.pageContent,
        metadata: {
          ...doc.metadata,
          hash: md5(doc.pageContent + (additionalMetadata?.agentId || "")),
        },
      })
    );
  }

  /**
   * Create Pinecone records from documents using batch embedding generation
   * @param docs - The documents to create records from
   * @param additionalMetadata - Additional metadata to include
   * @returns A promise that resolves to an array of PineconeRecord objects
   */
  private async createPineconeRecordsBatch(
    docs: Document[],
    additionalMetadata: AdditionalMetadata
  ): Promise<PineconeRecord<RecordMetadata>[]> {
    // Extract all text content for batch embedding
    const textContents = docs.map((doc) => doc.pageContent);

    console.log(
      `Generating embeddings for ${textContents.length} document chunks...`
    );

    // Generate embeddings in batch - much more efficient
    const embeddings = await getBatchEmbeddings(textContents);

    console.log(`✓ Generated ${embeddings.length} embeddings`);

    // Create records with the batch-generated embeddings
    return docs.map((doc, index): PineconeRecord<RecordMetadata> => {
      // Create hash for the ID
      const hash = doc.metadata.hash || md5(doc.pageContent);

      // Create metadata
      const metadata: Metadata = {
        chunk: doc.pageContent,
        hash: hash as string,
        ...additionalMetadata,
      };

      // Create the record
      return {
        id: hash as string,
        values: embeddings[index],
        metadata: metadata as RecordMetadata,
      };
    });
  }

  /**
   * Fetch vector records directly by their IDs
   * @param ids - Array of record IDs to retrieve
   * @returns A promise that resolves to the fetched records
   */
  async fetchRecordsByIds(ids: string[]): Promise<VectorDbResponse> {
    if (!this.index) {
      await this.initialize();
    }

    try {
      // Get the namespace-specific index
      const namespaceIndex = this.index!.namespace(this.config.namespace);

      // Fetch the records by IDs
      const fetchResponse = await namespaceIndex.fetch(ids);

      // Extract the records from the response
      const records = fetchResponse.records || {};

      return {
        success: true,
        data: {
          records: Object.entries(records).map(([id, record]) => ({
            id,
            values: record.values,
            metadata: record.metadata,
          })),
        },
      };
    } catch (error) {
      console.error("Error fetching records by IDs:", error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }
}
