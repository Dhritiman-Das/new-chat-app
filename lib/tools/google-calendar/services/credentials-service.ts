import { ToolContext } from "../../definitions/tool-interface";
import prisma from "@/lib/db/prisma";
import { google } from "googleapis";
import { Prisma } from "@/lib/generated/prisma";
import { ToolCredential } from "@/lib/generated/prisma";

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
    const { userId, toolCredentialId } = context;

    if (!userId) {
      throw new CredentialError("User ID is required", "USER_NOT_FOUND");
    }

    let toolCredential;

    if (toolCredentialId) {
      // If we have a credential ID, use that directly
      toolCredential = await prisma.toolCredential.findUnique({
        where: { id: toolCredentialId },
      });
    } else {
      // Otherwise look for Google credentials for this user
      toolCredential = await prisma.toolCredential.findFirst({
        where: {
          userId,
          provider: "google",
        },
      });
    }

    if (!toolCredential) {
      throw new CredentialError(
        "Google Calendar credentials not found. Please connect your Google Calendar account.",
        "CREDENTIALS_NOT_FOUND"
      );
    }

    // Extract and return credentials
    const credentials =
      toolCredential.credentials as unknown as GoogleCredentials;

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
  const { userId, toolCredentialId } = context;

  try {
    if (toolCredentialId) {
      await prisma.toolCredential.update({
        where: { id: toolCredentialId },
        data: {
          credentials: newCredentials as unknown as Prisma.InputJsonValue,
          updatedAt: new Date(),
        },
      });
    } else {
      await prisma.toolCredential.updateMany({
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
  const auth = await getGoogleAuthClient(context);
  return google.calendar({ version: "v3", auth });
}

/**
 * Fetch a user's Google calendars using stored credentials
 */
export async function getCalendarsForCredential(
  credential: ToolCredential
): Promise<Calendar[]> {
  try {
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
