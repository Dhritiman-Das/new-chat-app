"use server";

import { getVectorDb } from "./index";
import { toast } from "sonner";

/**
 * Example function to store text in the vector database
 */
export async function storeInVectorDb(
  text: string,
  userId: string,
  documentId: string
) {
  try {
    // Get the vector database instance
    const vectorDb = await getVectorDb();

    // Store the text with additional metadata
    const result = await vectorDb.upsert(
      {
        userId,
        documentId,
        timestamp: new Date().toISOString(),
      },
      text
    );

    if (!result.success) {
      throw result.error;
    }

    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    console.error("Error storing in vector database:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Example function to search the vector database
 */
export async function searchVectorDb(query: string, userId: string, topK = 5) {
  try {
    // Get the vector database instance
    const vectorDb = await getVectorDb();

    // Search with a filter for the specific user
    const results = await vectorDb.query({ userId }, query, topK);

    return {
      success: true,
      data: results,
    };
  } catch (error) {
    console.error("Error searching vector database:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Example function to delete data from the vector database
 */
export async function deleteFromVectorDb(documentId: string) {
  try {
    // Get the vector database instance
    const vectorDb = await getVectorDb();

    // Delete by filter
    const result = await vectorDb.deleteByFilter({ documentId });

    if (!result.success) {
      throw result.error;
    }

    toast("Document deleted from vector store", {
      description: `Document ID: ${documentId}`,
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error deleting from vector database:", error);
    toast.error("Failed to delete document from vector store", {
      description: error instanceof Error ? error.message : String(error),
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
