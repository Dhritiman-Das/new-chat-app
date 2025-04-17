/**
 * Google Calendar API wrapper
 * This file contains utilities for working with the Google Calendar API
 */

import prisma from "@/lib/db/prisma";

// Types for Google Calendar API responses
interface GoogleCalendarListEntry {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  colorId?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  accessRole?: string;
}

interface GoogleCalendarListResponse {
  kind: string;
  etag: string;
  nextPageToken?: string;
  nextSyncToken?: string;
  items: GoogleCalendarListEntry[];
}

// API Error type
class GoogleAPIError extends Error {
  status: number;
  data: Record<string, unknown>;

  constructor(message: string, status: number, data?: Record<string, unknown>) {
    super(message);
    this.name = "GoogleAPIError";
    this.status = status;
    this.data = data || {};
  }
}

/**
 * Refresh an access token using a refresh token
 */
async function refreshAccessToken(refreshToken: string) {
  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json();
      throw new GoogleAPIError(
        `Failed to refresh token: ${error.error_description || error.error}`,
        tokenResponse.status,
        error
      );
    }

    const tokens = await tokenResponse.json();
    return {
      access_token: tokens.access_token,
      expires_in: tokens.expires_in,
    };
  } catch (error) {
    console.error("Error refreshing access token:", error);
    throw error;
  }
}

/**
 * Get a valid access token for a user/tool
 * This will refresh the token if necessary
 */
async function getAccessToken(userId: string, toolId: string) {
  // Get the Google API credentials
  const credential = await prisma.toolCredential.findFirst({
    where: {
      userId,
      toolId,
      provider: "google",
    },
  });

  if (!credential) {
    throw new Error("Google Calendar not connected");
  }

  // Cast credentials to expected type
  const credentials = credential.credentials as Record<string, unknown>;
  const access_token = credentials.access_token as string;
  const expiry_date = credentials.expiry_date as string;
  const refresh_token = credentials.refresh_token as string;

  // Check if the token is expired
  if (new Date(expiry_date) <= new Date()) {
    // Refresh the token
    const { access_token: new_access_token, expires_in } =
      await refreshAccessToken(refresh_token);

    // Calculate new expiry date
    const newExpiryDate = new Date(
      Date.now() + expires_in * 1000
    ).toISOString();

    // Update the credential in the database
    await prisma.toolCredential.update({
      where: {
        id: credential.id,
      },
      data: {
        credentials: {
          ...credentials,
          access_token: new_access_token,
          expiry_date: newExpiryDate,
        },
      },
    });

    // Return the new access token
    return new_access_token;
  }

  // Return the existing access token
  return access_token;
}

/**
 * Make an authenticated request to the Google Calendar API
 */
async function googleCalendarRequest<T>(
  userId: string,
  toolId: string,
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    // Get a valid access token
    const accessToken = await getAccessToken(userId, toolId);

    // Set up headers with authorization
    const headers = new Headers(options.headers);
    headers.set("Authorization", `Bearer ${accessToken}`);
    headers.set("Content-Type", "application/json");

    // Make the request
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3${endpoint}`,
      {
        ...options,
        headers,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new GoogleAPIError(
        `Google Calendar API error: ${
          errorData.error?.message || response.statusText
        }`,
        response.status,
        errorData
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    console.error(
      `Error making Google Calendar API request to ${endpoint}:`,
      error
    );
    throw error;
  }
}

/**
 * Get a list of calendars for a user
 */
export async function getCalendars(userId: string, toolId: string) {
  try {
    const data = await googleCalendarRequest<GoogleCalendarListResponse>(
      userId,
      toolId,
      "/users/me/calendarList"
    );

    // Format the response
    return data.items.map((calendar) => ({
      id: calendar.id,
      name: calendar.summary,
      description: calendar.description,
      isPrimary: !!calendar.primary,
      colorId: calendar.colorId,
      backgroundColor: calendar.backgroundColor,
      foregroundColor: calendar.foregroundColor,
      accessRole: calendar.accessRole,
    }));
  } catch (error) {
    console.error("Error fetching calendars:", error);
    throw error;
  }
}

/**
 * Create a calendar event
 */
export async function createEvent(
  userId: string,
  toolId: string,
  calendarId: string,
  event: {
    summary: string;
    description?: string;
    location?: string;
    start: { dateTime: string; timeZone: string };
    end: { dateTime: string; timeZone: string };
    attendees?: { email: string; displayName?: string; optional?: boolean }[];
    sendUpdates?: "all" | "externalOnly" | "none";
  }
) {
  try {
    return await googleCalendarRequest(
      userId,
      toolId,
      `/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: "POST",
        body: JSON.stringify(event),
      }
    );
  } catch (error) {
    console.error("Error creating event:", error);
    throw error;
  }
}

/**
 * Get available time slots for a calendar
 */
export async function getAvailableSlots(
  userId: string,
  toolId: string,
  calendarId: string,
  startDateTime: string,
  endDateTime: string,
  durationMinutes: number = 30
) {
  try {
    // Get events in the time range - this would be used to calculate available slots
    await googleCalendarRequest(
      userId,
      toolId,
      `/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    // Calculate available slots based on existing events
    // This would be a more complex implementation in a real app

    // Return mock available slots for now
    return [
      {
        start: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        end: new Date(
          Date.now() + 24 * 60 * 60 * 1000 + durationMinutes * 60 * 1000
        ).toISOString(),
      },
      {
        start: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        end: new Date(
          Date.now() + 48 * 60 * 60 * 1000 + durationMinutes * 60 * 1000
        ).toISOString(),
      },
    ];
  } catch (error) {
    console.error("Error getting available slots:", error);
    throw error;
  }
}
