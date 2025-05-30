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
}
