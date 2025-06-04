import { OpenAI } from "openai";
import { EmbeddingProvider } from "./index";
import { env } from "@/src/env";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private model: string;

  constructor(model = "text-embedding-3-small") {
    this.model = model;
  }

  /**
   * Generate embeddings for a text using OpenAI
   * @param text - The text to embed
   * @returns A promise that resolves to an array of numbers representing the embedding
   */
  async getEmbeddings(text: string): Promise<number[]> {
    try {
      const response = await openai.embeddings.create({
        model: this.model,
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error("Error generating embeddings:", error);
      throw new Error(
        `Failed to generate embeddings: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Generate embeddings for multiple texts in batch using OpenAI
   * This is much more efficient than calling getEmbeddings multiple times
   * @param texts - Array of texts to embed
   * @returns A promise that resolves to an array of embedding arrays
   */
  async getBatchEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      // OpenAI API supports up to 2048 inputs per request for embeddings
      const batchSize = 2048;
      const results: number[][] = [];

      // Process in batches if needed
      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);

        const response = await openai.embeddings.create({
          model: this.model,
          input: batch,
        });

        // Extract embeddings in the same order as input
        const batchEmbeddings = response.data.map((item) => item.embedding);
        results.push(...batchEmbeddings);
      }

      return results;
    } catch (error) {
      console.error("Error generating batch embeddings:", error);
      throw new Error(
        `Failed to generate batch embeddings: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}
