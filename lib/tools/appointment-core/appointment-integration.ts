"use server";

import { storeAppointment } from "./appointment-storage";

interface Attendee {
  email: string;
  name?: string;
  response?: string;
  [key: string]: string | undefined;
}

interface Organizer {
  email: string;
  name?: string;
  [key: string]: string | undefined;
}

/**
 * Stores appointment data in the database after an appointment is created
 * in an external calendar service like Google Calendar
 */
export async function storeCalendarAppointment({
  botId,
  conversationId,
  calendarProvider,
  calendarId,
  externalEventId,
  title,
  description,
  startTime,
  endTime,
  timeZone,
  attendees,
  organizer,
  meetingLink,
  status,
  properties,
  metadata,
}: {
  botId: string;
  conversationId?: string;
  calendarProvider: string;
  calendarId?: string;
  externalEventId?: string;
  title?: string;
  description?: string;
  startTime: Date | string;
  endTime: Date | string;
  timeZone?: string;
  attendees?: Attendee[];
  organizer?: Organizer;
  meetingLink?: string;
  status?: string;
  properties?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}) {
  // Convert string dates to Date objects if needed
  const parsedStartTime =
    typeof startTime === "string" ? new Date(startTime) : startTime;
  const parsedEndTime =
    typeof endTime === "string" ? new Date(endTime) : endTime;

  return storeAppointment({
    botId,
    conversationId,
    calendarProvider,
    calendarId,
    externalEventId,
    title,
    description,
    startTime: parsedStartTime,
    endTime: parsedEndTime,
    timeZone,
    attendees,
    organizer,
    meetingLink,
    status,
    properties,
    metadata,
  });
}
