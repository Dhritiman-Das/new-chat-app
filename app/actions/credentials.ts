"use server";

import { prisma } from "@/lib/db/prisma";
import { createSafeActionClient } from "next-safe-action";
import { z } from "zod";
import { ActionResponse } from "./types";
import { appErrors } from "../types/errors";
import { BotTool } from "@/lib/generated/prisma";

const action = createSafeActionClient();

const getToolCredentialsSchema = z.object({
  toolId: z.string(),
  botId: z.string(),
});

/**
 * Get the credentials for a tool
 */
export const getToolCredentials = action
  .schema(getToolCredentialsSchema)
  .action(
    async ({
      parsedInput,
    }): Promise<
      ActionResponse<{
        credential: Credential | null;
        provider: string | null;
        botTool: BotTool | null;
      }>
    > => {
      try {
        const { toolId, botId } = parsedInput;

        const tool = await prisma.botTool.findUnique({
          where: { botId_toolId: { botId, toolId } },
          include: {
            credential: true,
          },
        });

        if (!tool) {
          return {
            success: false,
            error: appErrors.NOT_FOUND,
          };
        }

        return {
          success: true,
          data: {
            credential: tool.credential as Credential | null,
            botTool: tool,
            provider: tool.credential?.provider ?? null,
          },
        };
      } catch (error) {
        console.error("Error getting tool credentials:", error);
        return {
          success: false,
          error: appErrors.PROCESSING_ERROR,
        };
      }
    }
  );

const removeCredentialFromToolSchema = z.object({
  botToolId: z.string(),
});

/**
 * Remove a credential from a tool
 */
export const removeCredentialFromTool = action
  .schema(removeCredentialFromToolSchema)
  .action(async ({ parsedInput }): Promise<ActionResponse> => {
    try {
      const { botToolId } = parsedInput;

      const tool = await prisma.botTool.findUnique({
        where: { id: botToolId },
        include: {
          credential: true,
        },
      });

      if (!tool) {
        return {
          success: false,
          error: appErrors.NOT_FOUND,
        };
      }

      if (!tool.credentialId) {
        return {
          success: false,
          error: appErrors.NOT_FOUND,
        };
      }

      const credential = await prisma.credential.findUnique({
        where: { id: tool.credentialId },
      });

      if (!credential) {
        return {
          success: false,
          error: appErrors.NOT_FOUND,
        };
      }

      await prisma.credential.delete({
        where: { id: credential.id },
      });

      return {
        success: true,
      };
    } catch (error) {
      console.error("Error removing credential from tool:", error);
      return {
        success: false,
        data: {
          message: "Credential removed from tool",
        },
        error: appErrors.PROCESSING_ERROR,
      };
    }
  });

const checkIfProviderHasCredentialsSchema = z.object({
  provider: z.string(),
  botId: z.string(),
});

/**
 * Get the credentials for a provider of a bot
 */
export const getProviderCredentials = action
  .schema(checkIfProviderHasCredentialsSchema)
  .action(async ({ parsedInput }): Promise<ActionResponse> => {
    try {
      const { provider, botId } = parsedInput;

      const credentials = await prisma.credential.findFirst({
        where: {
          provider,
          botId,
        },
      });

      if (!credentials) {
        return {
          success: true,
          data: null,
        };
      }

      return {
        success: true,
        data: credentials,
      };
    } catch (error) {
      console.error("Error checking if provider has credentials:", error);
      return {
        success: false,
        error: appErrors.PROCESSING_ERROR,
      };
    }
  });

const removeCredentialSchema = z.object({
  credentialId: z.string(),
});

/**
 * Remove a credential from the database
 */
export const removeCredential = action
  .schema(removeCredentialSchema)
  .action(async ({ parsedInput }): Promise<ActionResponse> => {
    try {
      const { credentialId } = parsedInput;

      // Update all bot tools that have the credential to remove it
      await prisma.botTool.updateMany({
        where: {
          credentialId,
        },
        data: {
          credentialId: null,
        },
      });

      // Update all integrations that have the credential to remove it
      await prisma.integration.updateMany({
        where: {
          credentialId,
        },
        data: {
          credentialId: null,
          connectionStatus: "DISCONNECTED",
        },
      });

      // Delete the credential
      await prisma.credential.delete({
        where: { id: credentialId },
      });

      return {
        success: true,
      };
    } catch (error) {
      console.error("Error removing credential:", error);
      return {
        success: false,
        error: appErrors.PROCESSING_ERROR,
      };
    }
  });

const reconnectToolCredentialSchema = z.object({
  toolId: z.string(),
  botId: z.string(),
  provider: z.string(),
});

/**
 * Reconnect a credential to a bot tool
 */
export const reconnectToolCredential = action
  .schema(reconnectToolCredentialSchema)
  .action(async ({ parsedInput }): Promise<ActionResponse> => {
    try {
      const { toolId, botId, provider } = parsedInput;

      const tool = await prisma.botTool.findUnique({
        where: { botId_toolId: { botId, toolId } },
      });

      if (!tool) {
        return {
          success: false,
          error: appErrors.NOT_FOUND,
        };
      }

      const credential = await prisma.credential.findUnique({
        where: {
          botId_provider: {
            botId: tool.botId,
            provider,
          },
        },
      });

      if (!credential) {
        return {
          success: false,
          error: appErrors.NOT_FOUND,
        };
      }

      await prisma.botTool.update({
        where: { botId_toolId: { botId, toolId } },
        data: {
          credentialId: credential.id,
        },
      });

      return {
        success: true,
      };
    } catch (error) {
      console.error("Error reconnecting credential:", error);
      return {
        success: false,
        error: appErrors.PROCESSING_ERROR,
      };
    }
  });
