import { prisma } from "@/lib/db/prisma";
import { InputJsonValue } from "@/lib/generated/prisma/runtime/library";
import crypto from "crypto";

// Encryption implementation using Node.js crypto
// In a real app, consider using a dedicated key management system
// and rotating encryption keys periodically
function encryptData(data: Record<string, unknown>): Record<string, unknown> {
  try {
    const encryptionKey = process.env.CREDENTIALS_ENCRYPTION_KEY;
    if (!encryptionKey || encryptionKey.length < 32) {
      console.warn(
        "Warning: Missing or insufficient encryption key. Using unencrypted storage."
      );
      return data;
    }

    // We'll encrypt the stringified data
    const stringData = JSON.stringify(data);

    // Generate a random initialization vector
    const iv = crypto.randomBytes(16);

    // Create cipher using AES-256-CBC
    const cipher = crypto.createCipheriv(
      "aes-256-cbc",
      Buffer.from(encryptionKey.slice(0, 32)),
      iv
    );

    // Encrypt the data
    let encrypted = cipher.update(stringData, "utf8", "base64");
    encrypted += cipher.final("base64");

    // Return object with IV and encrypted data
    return {
      __encrypted: true,
      iv: iv.toString("hex"),
      data: encrypted,
    };
  } catch (error) {
    console.error("Encryption error:", error);
    // Fallback to unencrypted in case of error
    return data;
  }
}

function decryptData(data: Record<string, unknown>): Record<string, unknown> {
  try {
    // Check if the data is encrypted
    if (!data.__encrypted) {
      return data;
    }

    const encryptionKey = process.env.CREDENTIALS_ENCRYPTION_KEY;
    if (!encryptionKey || encryptionKey.length < 32) {
      console.warn("Warning: Missing or insufficient decryption key.");
      return data;
    }

    // Get the IV and encrypted data
    const iv = Buffer.from(data.iv as string, "hex");
    const encryptedData = data.data as string;

    // Create decipher
    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      Buffer.from(encryptionKey.slice(0, 32)),
      iv
    );

    // Decrypt the data
    let decrypted = decipher.update(encryptedData, "base64", "utf8");
    decrypted += decipher.final("utf8");

    // Parse and return the original data
    return JSON.parse(decrypted);
  } catch (error) {
    console.error("Decryption error:", error);
    // Return the data as is in case of error
    return data;
  }
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
