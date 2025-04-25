"use server";

import prisma from "@/lib/db/prisma";

// Initialize Prisma client

interface Organizer {
  email: string;
  name?: string;
  [key: string]: string | undefined;
}

interface Attendee {
  email: string;
  name?: string;
  response?: string;
  [key: string]: string | undefined;
}

export async function storeAppointment({
  botId,
  conversationId,
  calendarProvider,
  calendarId,
  externalEventId,
  title,
  description,
  location,
  startTime,
  endTime,
  timeZone,
  organizer,
  attendees,
  meetingLink,
  recurringPattern,
  status,
  source,
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
  location?: string;
  startTime: Date;
  endTime: Date;
  timeZone?: string;
  organizer?: Organizer;
  attendees?: Attendee[];
  meetingLink?: string;
  recurringPattern?: string;
  status?: string;
  source?: string;
  properties?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}) {
  try {
    const appointment = await prisma.appointment.create({
      data: {
        botId,
        conversationId,
        calendarProvider,
        calendarId,
        externalEventId,
        title,
        description,
        location,
        startTime,
        endTime,
        timeZone,
        organizer: organizer ? JSON.parse(JSON.stringify(organizer)) : null,
        attendees: attendees ? JSON.parse(JSON.stringify(attendees)) : null,
        meetingLink,
        recurringPattern,
        status: status || "confirmed",
        source: source || "chat",
        properties: properties ? JSON.parse(JSON.stringify(properties)) : null,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
      },
    });

    return {
      success: true,
      data: appointment,
    };
  } catch (error) {
    console.error("Error storing appointment:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to store appointment",
    };
  }
}

export async function getAppointmentsByBot(botId: string) {
  try {
    const appointments = await prisma.appointment.findMany({
      where: { botId },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      data: appointments,
    };
  } catch (error) {
    console.error("Error fetching appointments:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch appointments",
    };
  }
}

export async function getAppointmentById(id: string) {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id },
    });

    if (!appointment) {
      return {
        success: false,
        error: "Appointment not found",
      };
    }

    return {
      success: true,
      data: appointment,
    };
  } catch (error) {
    console.error("Error fetching appointment:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch appointment",
    };
  }
}

/**
 * Find an appointment by external event ID (from calendar service) and provider
 */
export async function findAppointmentByExternalId(
  externalEventId: string,
  calendarProvider: string
) {
  try {
    const appointment = await prisma.appointment.findFirst({
      where: {
        externalEventId,
        calendarProvider,
      },
    });

    if (!appointment) {
      return {
        success: false,
        error: "Appointment not found",
      };
    }

    return {
      success: true,
      data: appointment,
    };
  } catch (error) {
    console.error("Error fetching appointment by external ID:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch appointment by external ID",
    };
  }
}

/**
 * Update the status of an appointment
 */
export async function updateAppointmentStatus(
  id: string,
  status: string,
  properties?: Record<string, unknown>
) {
  try {
    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        status,
        ...(properties && {
          properties: JSON.parse(JSON.stringify(properties)),
        }),
        updatedAt: new Date(),
      },
    });

    return {
      success: true,
      data: appointment,
    };
  } catch (error) {
    console.error("Error updating appointment status:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update appointment status",
    };
  }
}

/**
 * Update appointment details when rescheduled
 */
export async function updateAppointment(
  id: string,
  data: {
    title?: string;
    description?: string;
    startTime?: Date;
    endTime?: Date;
    timeZone?: string;
    organizer?: Organizer | null;
    attendees?: Attendee[] | null;
    status?: string;
    properties?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }
) {
  try {
    // Process JSON fields
    const processedData = {
      ...data,
      organizer: data.organizer
        ? JSON.parse(JSON.stringify(data.organizer))
        : undefined,
      attendees: data.attendees
        ? JSON.parse(JSON.stringify(data.attendees))
        : undefined,
      properties: data.properties
        ? JSON.parse(JSON.stringify(data.properties))
        : undefined,
      metadata: data.metadata
        ? JSON.parse(JSON.stringify(data.metadata))
        : undefined,
      updatedAt: new Date(),
    };

    const appointment = await prisma.appointment.update({
      where: { id },
      data: processedData,
    });

    return {
      success: true,
      data: appointment,
    };
  } catch (error) {
    console.error("Error updating appointment:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update appointment",
    };
  }
}
