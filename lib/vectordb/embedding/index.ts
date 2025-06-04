/**
 * Interface for embedding providers
 */
export interface EmbeddingProvider {
  /**
   * Generate embeddings for a text
   * @param text - The text to embed
   * @returns A promise that resolves to an array of numbers representing the embedding
   */
  getEmbeddings(text: string): Promise<number[]>;

  /**
   * Generate embeddings for multiple texts in batch
   * @param texts - Array of texts to embed
   * @returns A promise that resolves to an array of embedding arrays
   */
  getBatchEmbeddings(texts: string[]): Promise<number[][]>;
}

/**
 * Abstract factory for creating embedding providers
 */
export abstract class EmbeddingFactory {
  static async getProvider(providerName: string): Promise<EmbeddingProvider> {
    switch (providerName.toLowerCase()) {
      case "openai":
        // Dynamic import to avoid circular dependencies
        const { OpenAIEmbeddingProvider } = await import("./openai");
        return new OpenAIEmbeddingProvider();
      default:
        throw new Error(`Embedding provider ${providerName} not supported`);
    }
  }
}

/**
 * Default embedding provider (lazy loaded)
 */
let defaultProvider: EmbeddingProvider | null = null;

/**
 * Generate embeddings for a text using the default provider
 * @param text - The text to embed
 * @returns A promise that resolves to an array of numbers representing the embedding
 */
export async function getEmbeddings(text: string): Promise<number[]> {
  if (!defaultProvider) {
    defaultProvider = await EmbeddingFactory.getProvider("openai");
  }
  return defaultProvider.getEmbeddings(text);
}

/**
 * Generate embeddings for multiple texts in batch using the default provider
 * @param texts - Array of texts to embed
 * @returns A promise that resolves to an array of embedding arrays
 */
export async function getBatchEmbeddings(texts: string[]): Promise<number[][]> {
  if (!defaultProvider) {
    defaultProvider = await EmbeddingFactory.getProvider("openai");
  }
  return defaultProvider.getBatchEmbeddings(texts);
}
