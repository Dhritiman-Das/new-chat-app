/**
 * Utilities for credential storage and retrieval
 */

import prisma from "@/lib/db/prisma";
import { TokenContext, BaseOAuthCredentials } from "../types";
import { CredentialError } from "../errors";
import { Prisma } from "@/lib/generated/prisma";

/**
 * Get stored OAuth credentials from the database
 */
export async function getCredentials<T extends BaseOAuthCredentials>(
  context: TokenContext
): Promise<T> {
  try {
    const { userId, credentialId, botId, provider } = context;

    if (!userId) {
      throw new CredentialError("User ID is required", "USER_NOT_FOUND");
    }

    let credential;

    if (credentialId) {
      // If we have a credential ID, use that directly
      credential = await prisma.credential.findUnique({
        where: { id: credentialId },
      });
    } else if (botId) {
      // If we have a bot ID, look for credentials associated with this bot
      credential = await prisma.credential.findFirst({
        where: {
          userId,
          provider,
          botId,
        },
        orderBy: {
          updatedAt: "desc",
        },
      });
    } else {
      // Otherwise look for credentials for this user and provider
      credential = await prisma.credential.findFirst({
        where: {
          userId,
          provider,
        },
        orderBy: {
          updatedAt: "desc",
        },
      });
    }

    if (!credential) {
      throw new CredentialError(
        `${provider} credentials not found. Please connect your account.`,
        "CREDENTIALS_NOT_FOUND"
      );
    }

    // Extract and return credentials
    return credential.credentials as unknown as T;
  } catch (error) {
    if (error instanceof CredentialError) {
      throw error;
    }

    throw new CredentialError(
      `Error retrieving credentials: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Update stored OAuth credentials in the database
 */
export async function updateCredentials<T extends BaseOAuthCredentials>(
  context: TokenContext,
  newCredentials: T
): Promise<void> {
  const { userId, credentialId, botId, provider } = context;

  try {
    if (credentialId) {
      await prisma.credential.update({
        where: { id: credentialId },
        data: {
          credentials: newCredentials as unknown as Prisma.InputJsonValue,
          updatedAt: new Date(),
        },
      });
    } else if (botId) {
      // Update credentials associated with this bot
      await prisma.credential.updateMany({
        where: {
          userId,
          provider,
          botId,
        },
        data: {
          credentials: newCredentials as unknown as Prisma.InputJsonValue,
          updatedAt: new Date(),
        },
      });
    } else {
      // Update all credentials for this user and provider
      await prisma.credential.updateMany({
        where: {
          userId,
          provider,
        },
        data: {
          credentials: newCredentials as unknown as Prisma.InputJsonValue,
          updatedAt: new Date(),
        },
      });
    }
  } catch (error) {
    console.error(`Failed to update ${provider} credentials:`, error);
    throw new CredentialError(
      `Failed to update credentials: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
