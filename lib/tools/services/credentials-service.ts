import { prisma } from "@/lib/db/prisma";
import { InputJsonValue } from "@/lib/generated/prisma/runtime/library";

// In a real app, you'd want to encrypt/decrypt credentials
// For this example, we'll skip that part but you should implement it
// using something like crypto or a dedicated encryption library
function encryptData(data: Record<string, unknown>): Record<string, unknown> {
  // In a real implementation, encrypt the data
  return data;
}

function decryptData(data: Record<string, unknown>): Record<string, unknown> {
  // In a real implementation, decrypt the data
  return data;
}

export class ToolCredentialsService {
  async createCredential({
    toolId,
    userId,
    provider,
    credentials,
    expiresAt,
  }: {
    toolId: string;
    userId: string;
    provider: string;
    credentials: Record<string, unknown>;
    expiresAt?: Date;
  }) {
    // Encrypt sensitive credential data
    const encryptedCredentials = encryptData(credentials);

    return prisma.toolCredential.create({
      data: {
        toolId,
        userId,
        provider,
        credentials: encryptedCredentials as InputJsonValue,
        expiresAt,
      },
    });
  }

  async updateCredential(
    credentialId: string,
    credentials: Record<string, unknown>,
    expiresAt?: Date
  ) {
    const encryptedCredentials = encryptData(credentials);

    return prisma.toolCredential.update({
      where: { id: credentialId },
      data: {
        credentials: encryptedCredentials as InputJsonValue,
        expiresAt,
        updatedAt: new Date(),
      },
    });
  }

  async getCredential(credentialId: string) {
    const credential = await prisma.toolCredential.findUnique({
      where: { id: credentialId },
    });

    if (!credential) return null;

    // Decrypt credentials for use
    return {
      ...credential,
      credentials: decryptData(
        credential.credentials as Record<string, unknown>
      ),
    };
  }

  async findCredentialsByProvider(userId: string, provider: string) {
    const credentials = await prisma.toolCredential.findMany({
      where: {
        userId,
        provider,
        // Optionally filter out expired credentials
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: {
        updatedAt: "desc", // Get the most recently updated first
      },
    });

    // No need to decrypt here since we're just returning IDs
    return credentials;
  }
}

export const toolCredentialsService = new ToolCredentialsService();
