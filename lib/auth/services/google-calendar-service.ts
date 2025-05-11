/**
 * Google Calendar API Service
 * Provides functions to interact with Google Calendar API
 */

import { ToolContext } from "@/lib/tools/definitions/tool-interface";
import { TokenContext } from "../types";
import { CredentialError } from "../errors";
import prisma from "@/lib/db/prisma";
import { calendar_v3 } from "googleapis";
import {
  createGoogleCalendarClient,
  CalendarClient,
} from "../clients/google/calendar";

// Calendar interface for the frontend
export interface Calendar {
  id: string;
  name: string;
  isPrimary?: boolean;
  description?: string;
  backgroundColor?: string;
  foregroundColor?: string;
}

/**
 * Convert tool context to token context
 */
function createTokenContext(toolContext: ToolContext): TokenContext {
  return {
    userId: toolContext.userId || "",
    credentialId: toolContext.credentialId,
    botId: toolContext.botId,
    provider: "google",
  };
}

/**
 * Get a Google Calendar API client
 */
export async function getGoogleCalendarClient(
  toolContext: ToolContext
): Promise<CalendarClient> {
  try {
    console.log("Getting Google Calendar client", toolContext);

    if (!toolContext.userId) {
      throw new CredentialError("User ID is required", "USER_NOT_FOUND");
    }

    // Create token context from tool context
    const tokenContext = createTokenContext(toolContext);

    // Use the specialized calendar client factory
    return createGoogleCalendarClient(tokenContext);
  } catch (error) {
    console.error("Error getting Google Calendar client:", error);
    throw error;
  }
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

    // Create a token context
    const tokenContext: TokenContext = {
      userId: credential.userId,
      credentialId,
      provider: "google",
    };

    // Get the calendar client
    const calendarClient = await createGoogleCalendarClient(tokenContext);

    // Fetch calendars
    const response = await calendarClient.listCalendars();

    if (!response.data.items) {
      return [];
    }

    // Transform the response to our Calendar interface
    return response.data.items.map(
      (cal: calendar_v3.Schema$CalendarListEntry) => ({
        id: cal.id || "",
        name: cal.summary || "",
        isPrimary: cal.primary || false,
        description: cal.description || undefined,
        backgroundColor: cal.backgroundColor || undefined,
        foregroundColor: cal.foregroundColor || undefined,
      })
    );
  } catch (error) {
    console.error("Error fetching Google calendars:", error);
    throw new Error(
      `Failed to fetch Google calendars: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
