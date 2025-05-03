import { ToolContext } from "../../definitions/tool-interface";
import prisma from "@/lib/db/prisma";
import { google } from "googleapis";
import { Prisma } from "@/lib/generated/prisma";

interface GoogleCredentials {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expiry_date: number | string;
  scope?: string;
}

// Calendar interface for the frontend
export interface Calendar {
  id: string;
  name: string;
  isPrimary?: boolean;
  description?: string;
  backgroundColor?: string;
  foregroundColor?: string;
}

// Error class for credential issues
export class CredentialError extends Error {
  code: string;

  constructor(message: string, code = "CREDENTIAL_ERROR") {
    super(message);
    this.name = "CredentialError";
    this.code = code;
  }
}

/**
 * Get Google OAuth credentials from the database
 */
export async function getGoogleCredentials(
  context: ToolContext
): Promise<GoogleCredentials> {
  try {
    // Use context to identify the user and tool
    const { userId, credentialId, botId } = context;

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
          provider: "google",
          botId,
        },
        orderBy: {
          updatedAt: "desc",
        },
      });
    } else {
      // Otherwise look for Google credentials for this user
      credential = await prisma.credential.findFirst({
        where: {
          userId,
          provider: "google",
        },
        orderBy: {
          updatedAt: "desc",
        },
      });
    }

    if (!credential) {
      throw new CredentialError(
        "Google Calendar credentials not found. Please connect your Google Calendar account.",
        "CREDENTIALS_NOT_FOUND"
      );
    }

    // Extract and return credentials
    const credentials = credential.credentials as unknown as GoogleCredentials;

    return credentials;
  } catch (error) {
    if (error instanceof CredentialError) {
      throw error;
    }

    throw new CredentialError(
      `Error retrieving Google credentials: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Initialize an authenticated Google OAuth2 client
 */
export async function getGoogleAuthClient(context: ToolContext) {
  const credentials = await getGoogleCredentials(context);

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/google`
  );

  // Set credentials
  oauth2Client.setCredentials({
    access_token: credentials.access_token,
    refresh_token: credentials.refresh_token,
    expiry_date:
      typeof credentials.expiry_date === "string"
        ? new Date(credentials.expiry_date).getTime()
        : credentials.expiry_date,
  });

  // Configure token refresh logic
  oauth2Client.on("tokens", async (tokens) => {
    if (tokens.refresh_token) {
      // Update the stored credentials with the new refresh token
      await updateGoogleCredentials(context, {
        ...credentials,
        access_token: tokens.access_token || credentials.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date || credentials.expiry_date,
      });
    } else if (tokens.access_token) {
      // Just update the access token
      await updateGoogleCredentials(context, {
        ...credentials,
        access_token: tokens.access_token,
        expiry_date: tokens.expiry_date || credentials.expiry_date,
      });
    }
  });

  return oauth2Client;
}

/**
 * Update Google credentials in the database
 */
async function updateGoogleCredentials(
  context: ToolContext,
  newCredentials: GoogleCredentials
) {
  const { userId, credentialId, botId } = context;

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
          provider: "google",
          botId,
        },
        data: {
          credentials: newCredentials as unknown as Prisma.InputJsonValue,
          updatedAt: new Date(),
        },
      });
    } else {
      // Update all Google credentials for this user (old behavior)
      await prisma.credential.updateMany({
        where: {
          userId,
          provider: "google",
        },
        data: {
          credentials: newCredentials as unknown as Prisma.InputJsonValue,
          updatedAt: new Date(),
        },
      });
    }
  } catch (error) {
    console.error("Failed to update Google credentials:", error);
  }
}

/**
 * Initialize the Google Calendar API client
 */
export async function getGoogleCalendarClient(context: ToolContext) {
  console.log("Getting Google Calendar client", context);
  const auth = await getGoogleAuthClient(context);
  return google.calendar({ version: "v3", auth });
}

/**
 * Fetch a user's Google calendars using stored credentials
 */
export async function getCalendarsForCredential(
  credentialId: string
): Promise<Calendar[]> {
  try {
    // Get the credential
    const credential = await prisma.credential.findUnique({
      where: { id: credentialId },
    });

    if (!credential) {
      throw new Error("Credential not found");
    }

    // Extract credentials
    const credentials = credential.credentials as unknown as GoogleCredentials;

    // Create OAuth client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/google`
    );

    // Set credentials
    oauth2Client.setCredentials({
      access_token: credentials.access_token,
      refresh_token: credentials.refresh_token,
      expiry_date:
        typeof credentials.expiry_date === "string"
          ? new Date(credentials.expiry_date).getTime()
          : credentials.expiry_date,
    });

    // Initialize calendar API
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    // Fetch calendars
    const response = await calendar.calendarList.list();

    if (!response.data.items) {
      return [];
    }

    // Transform the response to our Calendar interface
    return response.data.items.map((cal) => ({
      id: cal.id || "",
      name: cal.summary || "",
      isPrimary: cal.primary || false,
      description: cal.description || undefined,
      backgroundColor: cal.backgroundColor || undefined,
      foregroundColor: cal.foregroundColor || undefined,
    }));
  } catch (error) {
    console.error("Error fetching Google calendars:", error);
    throw new Error(
      `Failed to fetch Google calendars: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
