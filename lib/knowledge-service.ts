import {
  processPdf,
  processTextFile,
  processWordDocument,
  processExcelFile,
} from "./document-processor";
import { getVectorDb } from "./vectordb";
import { splitDocument } from "./vectordb/utils";
import { prisma } from "./db/prisma";
import { EmbeddingStatus } from "./generated/prisma";

/**
 * Process a file and store its content in the vector database
 */
export async function processAndStoreFile(
  fileData: {
    fileName: string;
    fileType: string;
    fileSize: number;
    botId: string;
    orgId: string;
    knowledgeBaseId: string;
    content: string;
  },
  fileBuffer?: ArrayBuffer
): Promise<{
  success: boolean;
  fileId?: string;
  error?: string;
  characterCount: number;
}> {
  try {
    let content = fileData.content;
    let characterCount = content.length;

    // If a file buffer is provided, process it based on file type
    if (fileBuffer) {
      let extractedContent: string;

      // Extract content based on file type
      switch (fileData.fileType) {
        case "application/pdf":
          extractedContent = await processPdf(fileBuffer);
          break;
        case "text/plain":
          extractedContent = await processTextFile(fileBuffer);
          break;
        case "application/msword":
        case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
          extractedContent = await processWordDocument(fileBuffer);
          break;
        case "application/vnd.ms-excel":
        case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
          extractedContent = await processExcelFile(fileBuffer);
          break;
        default:
          throw new Error(`Unsupported file type: ${fileData.fileType}`);
      }

      content = extractedContent;
      characterCount = content.length;
    }

    // Get the knowledge base, creating it if it doesn't exist
    let knowledgeBase = await prisma.knowledgeBase.findUnique({
      where: { id: fileData.knowledgeBaseId },
    });

    if (!knowledgeBase && fileData.knowledgeBaseId === "default") {
      knowledgeBase = await prisma.knowledgeBase.create({
        data: {
          botId: fileData.botId,
          name: "Default Knowledge Base",
          description: "Default knowledge base for this bot",
        },
      });
    } else if (!knowledgeBase) {
      throw new Error("Knowledge base not found");
    }

    // Create the file record in the database - initially with PROCESSING status
    const file = await prisma.knowledgeFile.create({
      data: {
        knowledgeBaseId: knowledgeBase.id,
        fileName: fileData.fileName,
        fileType: fileData.fileType,
        fileSize: fileData.fileSize,
        filePath: "", // We're not saving the actual file
        embeddingStatus: EmbeddingStatus.PROCESSING,
        metadata: { characterCount },
      },
    });

    // Split the document into chunks
    const documents = await splitDocument(content);

    // Get the vector database
    const vectorDb = await getVectorDb();

    // Prepare all chunks for batch processing
    const batchEntries = documents.map((doc) => ({
      text: doc.pageContent,
      additionalMetadata: {
        documentId: file.id,
        botId: fileData.botId,
        namespace: `kb-${knowledgeBase.id}`,
        timestamp: new Date().toISOString(),
      },
    }));

    // Use batch upsert for better performance
    const upsertResult = await vectorDb.batchUpsert(batchEntries, true); // Conservative mode

    if (!upsertResult.success) {
      throw new Error(`Failed to store document chunks: ${upsertResult.error}`);
    }

    // Update the file record to indicate successful processing
    await prisma.knowledgeFile.update({
      where: { id: file.id },
      data: {
        embeddingStatus: EmbeddingStatus.COMPLETED,
      },
    });

    return {
      success: true,
      fileId: file.id,
      characterCount,
    };
  } catch (error) {
    console.error("Error processing and storing file:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      characterCount: 0,
    };
  }
}

/**
 * Delete a file and its associated vector embeddings
 */
export async function deleteFileAndVectors(
  fileId: string,
  botId: string,
  knowledgeBaseId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // First, check if the file exists
    const file = await prisma.knowledgeFile.findUnique({
      where: { id: fileId },
      include: { knowledgeBase: true },
    });

    if (!file) {
      throw new Error("File not found");
    }

    // Verify the file belongs to the specified knowledge base and bot
    if (
      file.knowledgeBaseId !== knowledgeBaseId ||
      file.knowledgeBase.botId !== botId
    ) {
      throw new Error("Unauthorized access to this file");
    }

    // Get the vector database
    const vectorDb = await getVectorDb();

    // Delete all vector records associated with this file
    await vectorDb.deleteByFilter({ documentId: fileId });

    // Delete the file record from the database
    await prisma.knowledgeFile.delete({
      where: { id: fileId },
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting file and vectors:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
