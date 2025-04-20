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
import { getEmbeddings } from "../../embedding";
import { truncateStringByBytes } from "../../utils";
import * as pineconeUtils from "./utils";
import { VectorDbService } from "../..";

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
      indexName: process.env.PINECONE_INDEX || "default-index",
      namespace: Namespace.default,
      dimensions: 1536, // OpenAI embedding dimensions
      chunkSize: 500,
      chunkOverlap: 20,
      upsertBatchSize: 100,
      topK: 5,
      minScore: 0.6,
      ...config,
    };

    // Initialize Pinecone client
    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
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

      // Create vectors for each document
      const records = await Promise.all(
        documents.map((doc) =>
          this.createPineconeRecord(doc, additionalMetadata)
        )
      );

      // Upsert the vectors
      await pineconeUtils.chunkedUpsert(
        this.index!,
        records,
        this.config.namespace,
        this.config.upsertBatchSize
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
   * Create a Pinecone record from a document
   * @param doc - The document to create a record from
   * @param additionalMetadata - Additional metadata to include
   * @returns A promise that resolves to a PineconeRecord
   */
  private async createPineconeRecord(
    doc: Document,
    additionalMetadata: AdditionalMetadata
  ): Promise<PineconeRecord<RecordMetadata>> {
    // Generate embeddings for the document
    const embedding = await getEmbeddings(doc.pageContent);

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
      values: embedding,
      metadata: metadata as RecordMetadata,
    };
  }
}
