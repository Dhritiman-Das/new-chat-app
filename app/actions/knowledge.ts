"use server";

import { createSafeActionClient } from "next-safe-action";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/utils/auth";
import { revalidateTag } from "next/cache";
import { AppError, appErrors } from "@/app/types/errors";
import { EmbeddingStatus } from "@/lib/generated/prisma";
import { ActionResponse } from "./types";
import * as CACHE_TAGS from "@/lib/constants/cache-tags";

// Create a safe action client
const action = createSafeActionClient();

// Schema for file upload
const uploadFileSchema = z.object({
  fileName: z.string(),
  fileType: z.string(),
  fileSize: z.number(),
  characterCount: z.number(),
  botId: z.string(),
  orgId: z.string(),
  knowledgeBaseId: z.string(),
  content: z.string(), // Extracted text content
});

// Schema for file deletion
const deleteFileSchema = z.object({
  fileId: z.string(),
  botId: z.string(),
  orgId: z.string(),
  knowledgeBaseId: z.string(),
});

// Upload file action
export const uploadFile = action
  .schema(uploadFileSchema)
  .action(async ({ parsedInput }): Promise<ActionResponse> => {
    try {
      await requireAuth();

      const {
        fileName,
        fileType,
        fileSize,
        characterCount,
        botId,
        knowledgeBaseId,
        // orgId and content are required in schema but not used in this implementation
      } = parsedInput;

      // Check if knowledge base exists, create it if it's "default"
      let knowledgeBase = await prisma.knowledgeBase.findUnique({
        where: { id: knowledgeBaseId },
      });

      // Create a default knowledge base if it doesn't exist
      if (!knowledgeBase && knowledgeBaseId === "default") {
        knowledgeBase = await prisma.knowledgeBase.create({
          data: {
            botId,
            name: "Default Knowledge Base",
            description: "Default knowledge base for this bot",
          },
        });
      } else if (!knowledgeBase) {
        throw new Error("Knowledge base not found");
      }

      // Create the knowledge file record
      const file = await prisma.knowledgeFile.create({
        data: {
          knowledgeBaseId: knowledgeBase.id,
          fileName,
          fileType,
          fileSize,
          filePath: "", // We're not saving the actual file
          embeddingStatus: EmbeddingStatus.COMPLETED, // Mock as already processed
          metadata: { characterCount },
        },
      });

      // In a real implementation, we would:
      // 1. Store the file content in a vector database or similar with parsedInput.content
      // 2. Process embeddings for the content
      // 3. Update the file status when processing is complete

      // Revalidate cache tags
      revalidateTag(CACHE_TAGS.BOT(botId));
      revalidateTag(CACHE_TAGS.KNOWLEDGE_BASE(knowledgeBase.id));

      return {
        success: true,
        data: file,
      };
    } catch (error) {
      console.error("Upload file error:", error);

      return {
        success: false,
        error: error instanceof AppError ? error : appErrors.UNEXPECTED_ERROR,
      };
    }
  });

// Delete file action
export const deleteFile = action
  .schema(deleteFileSchema)
  .action(async ({ parsedInput }): Promise<ActionResponse> => {
    try {
      await requireAuth();

      const {
        fileId,
        botId,
        knowledgeBaseId,
        // orgId is required in schema but not used in this implementation
      } = parsedInput;

      // Check if file exists
      const file = await prisma.knowledgeFile.findUnique({
        where: { id: fileId },
        include: { knowledgeBase: true },
      });

      if (!file) {
        throw new Error("File not found");
      }

      // Check if the file belongs to the specified knowledge base and bot
      if (
        file.knowledgeBaseId !== knowledgeBaseId ||
        file.knowledgeBase.botId !== botId
      ) {
        throw new Error("Unauthorized access to this file");
      }

      // Delete the file
      await prisma.knowledgeFile.delete({
        where: { id: fileId },
      });

      // In a real implementation, we would also:
      // 1. Delete the file content from storage
      // 2. Remove embeddings from vector database

      // Revalidate cache tags
      revalidateTag(CACHE_TAGS.BOT(botId));
      revalidateTag(CACHE_TAGS.KNOWLEDGE_BASE(knowledgeBaseId));

      return {
        success: true,
      };
    } catch (error) {
      console.error("Delete file error:", error);

      return {
        success: false,
        error: error instanceof AppError ? error : appErrors.UNEXPECTED_ERROR,
      };
    }
  });
