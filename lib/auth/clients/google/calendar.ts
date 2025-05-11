/**
 * Google Calendar API client implementation
 */

import { calendar_v3 } from "googleapis";
import { TokenContext } from "../../types";
import { createGoogleClient } from "./index";

/**
 * Calendar client for Google Calendar API
 * Provides specialized methods for calendar operations
 */
export class CalendarClient {
  private client: calendar_v3.Calendar;

  constructor(client: calendar_v3.Calendar) {
    this.client = client;
  }

  /**
   * Get a list of calendars
   */
  async listCalendars() {
    return this.client.calendarList.list();
  }

  /**
   * Get a specific calendar
   */
  async getCalendar(calendarId: string) {
    return this.client.calendars.get({ calendarId });
  }

  /**
   * List events from a calendar
   */
  async listEvents(
    calendarId: string,
    params: calendar_v3.Params$Resource$Events$List = {}
  ) {
    return this.client.events.list({
      calendarId,
      ...params,
    });
  }

  /**
   * Create an event
   */
  async createEvent(calendarId: string, event: calendar_v3.Schema$Event) {
    return this.client.events.insert({
      calendarId,
      requestBody: event,
    });
  }

  /**
   * Update an event
   */
  async updateEvent(
    calendarId: string,
    eventId: string,
    event: calendar_v3.Schema$Event
  ) {
    return this.client.events.update({
      calendarId,
      eventId,
      requestBody: event,
    });
  }

  /**
   * Delete an event
   */
  async deleteEvent(
    calendarId: string,
    eventId: string,
    options?: { sendUpdates?: "none" | "all" | "externalOnly" }
  ) {
    return this.client.events.delete({
      calendarId,
      eventId,
      ...options,
    });
  }

  /**
   * Get a specific event
   */
  async getEvent(calendarId: string, eventId: string) {
    return this.client.events.get({
      calendarId,
      eventId,
    });
  }

  /**
   * Get the underlying API client
   */
  get apiClient() {
    return this.client;
  }
}

/**
 * Create a Google Calendar API client
 */
export async function createGoogleCalendarClient(
  context: TokenContext
): Promise<CalendarClient> {
  try {
    // Get the base Google client
    const googleClient = await createGoogleClient(context);

    // Extract the calendar client and wrap it in our CalendarClient
    return new CalendarClient(googleClient.calendar);
  } catch (error) {
    console.error("Error creating Google Calendar client:", error);
    throw error;
  }
}
