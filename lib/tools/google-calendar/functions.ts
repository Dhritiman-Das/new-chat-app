import { ToolFunction } from "../definitions/tool-interface";
import {
  bookAppointmentSchema,
  rescheduleAppointmentSchema,
  cancelAppointmentSchema,
  listAppointmentsSchema,
  listAvailableSlotsSchema,
} from "./schema";
import { getGoogleCalendarClient } from "@/lib/auth/services/google-calendar-service";
import {
  getDateRange,
  getDateTimeRangeInUserTimeZone,
} from "./utils/date-utils";
import {
  validateAppointmentTime,
  AppointmentValidationError,
} from "./utils/validation-utils";
import {
  parseISO,
  format,
  formatISO,
  addMinutes,
  eachDayOfInterval,
  areIntervalsOverlapping,
} from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import prisma from "@/lib/db/prisma";

// Type for Google API errors
interface GoogleApiError {
  code: number;
  errors?: Array<{ message: string }>;
  message?: string;
}

// Type for config
interface CalendarConfig {
  appointmentDuration?: number;
  defaultCalendarId?: string;
  bufferTimeBetweenMeetings?: number;
  availabilityWindowDays?: number;
  availableTimeSlots?: Array<{
    day: string;
    startTime: string;
    endTime: string;
  }>;
  timeZone?: string;
}

const DEFAULT_TIME_ZONE = "America/New_York";

export const bookAppointment: ToolFunction = {
  description: "Book a new appointment on Google Calendar",
  parameters: bookAppointmentSchema,
  execute: async (params, context) => {
    try {
      // Get the calendar API client
      const calendarClient = await getGoogleCalendarClient(context);

      // Get config from context and type it correctly
      const config = (context.config || {}) as CalendarConfig;
      const appointmentDuration = config.appointmentDuration || 30;
      const defaultCalendarId = config.defaultCalendarId || "primary";
      const bufferTimeBetweenMeetings = config.bufferTimeBetweenMeetings || 0;

      // Extract parameters with defaults
      const {
        title,
        description = "",
        startTime,
        userTimeZone,
      } = params as {
        title: string;
        description?: string;
        startTime?: string;
        userTimeZone?: string;
      };

      if (!startTime) {
        return {
          success: false,
          error: {
            code: "MISSING_START_TIME",
            message: "Start time is required to book an appointment",
          },
        };
      }

      // Validate that the appointment time adheres to calendar configuration
      try {
        validateAppointmentTime(startTime, appointmentDuration, config);
      } catch (validationError) {
        if (validationError instanceof AppointmentValidationError) {
          return {
            success: false,
            error: {
              code: validationError.code,
              message: validationError.message,
            },
          };
        }
        throw validationError; // Re-throw if it's not our expected error type
      }

      // Parse the start time
      const parsedStartTime = parseISO(startTime);

      // Format dates in RFC3339 format (required by Google Calendar API)
      const formattedStartTime = formatISO(parsedStartTime);

      // Calculate end time from start time and duration (including buffer)
      const totalDuration =
        appointmentDuration + Number(bufferTimeBetweenMeetings);
      const actualMeetingEndTime = addMinutes(
        parsedStartTime,
        appointmentDuration
      );
      const bufferEndTime = addMinutes(parsedStartTime, totalDuration);

      // Format end times
      const formattedActualEndTime = formatISO(actualMeetingEndTime);
      const formattedBufferEndTime = formatISO(bufferEndTime);

      // Use userTimeZone if provided, otherwise fall back to config.timeZone or default
      const timeZone = userTimeZone || config.timeZone || DEFAULT_TIME_ZONE;

      // Create the event - if there's a buffer, include it in the event's end time
      // but note the actual meeting end time in the description
      const meetingEndTimeFormatted = format(actualMeetingEndTime, "h:mm a");
      const enhancedDescription =
        bufferTimeBetweenMeetings > 0
          ? `${description}\n\nActual meeting end time: ${meetingEndTimeFormatted}\nBuffer time: ${bufferTimeBetweenMeetings} minutes after meeting`
          : description;

      const event = {
        summary: title,
        description: enhancedDescription,
        start: {
          dateTime: formattedStartTime,
          timeZone: timeZone,
        },
        end: {
          dateTime:
            Number(bufferTimeBetweenMeetings) > 0
              ? formattedBufferEndTime
              : formattedActualEndTime,
          timeZone: timeZone,
        },
        reminders: {
          useDefault: true,
        },
      };

      console.log("Creating event with:", {
        start: event.start,
        end: event.end,
        calendar: defaultCalendarId,
      });

      // Insert the event into the calendar
      const response = await calendarClient.createEvent(
        defaultCalendarId,
        event
      );

      if (!response || !response.data || !response.data.id) {
        throw new Error("Failed to create calendar event");
      }

      // Format start and end times for response
      const formalDate = format(parsedStartTime, "EEEE, MMMM d, yyyy");
      const formalTime = format(parsedStartTime, "h:mm a");

      // Extract event details for storage
      const appointmentDetails = {
        id: response.data.id,
        title: response.data.summary || title,
        date: format(parsedStartTime, "yyyy-MM-dd"),
        time: format(parsedStartTime, "HH:mm"),
        duration: appointmentDuration,
        bufferTime: Number(bufferTimeBetweenMeetings),
        link: response.data.htmlLink || "",
        calendarId: defaultCalendarId,
      };

      // Store appointment in our database
      try {
        // Dynamic import to avoid circular dependencies
        const { storeCalendarAppointment } = await import(
          "../appointment-core/appointment-integration"
        );

        // Process organizer data
        let organizerData = undefined;
        if (response.data.organizer?.email) {
          organizerData = {
            email: response.data.organizer.email,
            name: response.data.organizer.displayName || "",
          };
        }

        // Process attendees data - filter out any attendees without email
        const attendeesData =
          response.data.attendees
            ?.filter(
              (
                attendee
              ): attendee is {
                email: string;
                displayName?: string;
                responseStatus?: string;
              } => typeof attendee.email === "string"
            )
            .map((attendee) => ({
              email: attendee.email,
              name: attendee.displayName || "",
              response: attendee.responseStatus || "",
            })) || [];

        await storeCalendarAppointment({
          botId: context.botId,
          conversationId: context.conversationId,
          calendarProvider: "google",
          calendarId: defaultCalendarId,
          externalEventId: response.data.id || undefined,
          title: response.data.summary || title,
          description: response.data.description || description,
          startTime: parsedStartTime,
          endTime: actualMeetingEndTime,
          timeZone: timeZone,
          organizer: organizerData,
          attendees: attendeesData,
          meetingLink: response.data.htmlLink || "",
          status: response.data.status || "confirmed",
          properties: {
            eventId: response.data.id,
            iCalUID: response.data.iCalUID,
            appointmentDuration,
            bufferTime: bufferTimeBetweenMeetings,
          },
          metadata: {
            source: "google-calendar-tool",
            created: new Date().toISOString(),
          },
        });
      } catch (storageError) {
        // Log error but don't fail the appointment booking
        console.error("Error storing appointment in database:", storageError);
      }

      return {
        success: true,
        appointmentId: response.data.id,
        appointmentDetails,
        message: `Successfully booked appointment: ${title} on ${formalDate} at ${formalTime}`,
      };
    } catch (error) {
      console.error("Error booking appointment:", error);
      // Extract the Google API error details if available
      const apiError = error as GoogleApiError;
      const errorMessage =
        apiError.errors?.map((e) => e.message).join(", ") ||
        (error instanceof Error ? error.message : String(error));

      return {
        success: false,
        error: {
          code: "BOOKING_FAILED",
          message: `Failed to book appointment: ${errorMessage}`,
        },
      };
    }
  },
};

export const rescheduleAppointment: ToolFunction = {
  description: "Reschedule an existing appointment on Google Calendar",
  parameters: rescheduleAppointmentSchema,
  execute: async (params, context) => {
    try {
      // Get the calendar API client
      const calendarClient = await getGoogleCalendarClient(context);

      // Get config from context
      const config = (context.config || {}) as CalendarConfig;
      const appointmentDuration = config.appointmentDuration || 30;
      const defaultCalendarId = config.defaultCalendarId || "primary";
      const bufferTimeBetweenMeetings = config.bufferTimeBetweenMeetings || 0;

      // Extract parameters
      const { appointmentId, startTime, userTimeZone } = params as {
        appointmentId: string;
        startTime?: string;
        userTimeZone?: string;
      };

      if (!startTime) {
        return {
          success: false,
          error: {
            code: "MISSING_START_TIME",
            message: "Start time is required to reschedule an appointment",
          },
        };
      }

      // First, get the existing event to determine current parameters
      const existingEvent = await calendarClient.getEvent(
        defaultCalendarId,
        appointmentId
      );

      if (!existingEvent || !existingEvent.data) {
        throw new Error(
          `Appointment with ID ${appointmentId} not found in calendar ${defaultCalendarId}`
        );
      }

      // Validate that the new appointment time adheres to calendar configuration
      try {
        validateAppointmentTime(startTime, appointmentDuration, config);
      } catch (validationError) {
        if (validationError instanceof AppointmentValidationError) {
          return {
            success: false,
            error: {
              code: validationError.code,
              message: validationError.message,
            },
          };
        }
        throw validationError; // Re-throw if it's not our expected error type
      }

      // Parse the new start time
      const parsedStartTime = parseISO(startTime);

      // Format dates in RFC3339 format (required by Google Calendar API)
      const formattedStartTime = formatISO(parsedStartTime);

      // Calculate end time from start time and duration (including buffer)
      const totalDuration =
        appointmentDuration + Number(bufferTimeBetweenMeetings);
      const actualMeetingEndTime = addMinutes(
        parsedStartTime,
        appointmentDuration
      );
      const bufferEndTime = addMinutes(parsedStartTime, totalDuration);

      // Format end times
      const formattedActualEndTime = formatISO(actualMeetingEndTime);
      const formattedBufferEndTime = formatISO(bufferEndTime);

      // Use userTimeZone if provided, otherwise fall back to config.timeZone or default
      const timeZone = userTimeZone || config.timeZone || DEFAULT_TIME_ZONE;

      // Update the event with new times and preserve other properties
      const meetingEndTimeFormatted = format(actualMeetingEndTime, "h:mm a");
      const originalDescription =
        existingEvent.data.description?.replace(
          /\n\nActual meeting end time:.+?minutes after meeting/,
          ""
        ) || "";
      const enhancedDescription =
        bufferTimeBetweenMeetings > 0
          ? `${originalDescription}\n\nActual meeting end time: ${meetingEndTimeFormatted}\nBuffer time: ${bufferTimeBetweenMeetings} minutes after meeting`
          : originalDescription;

      const updatedEvent = {
        ...existingEvent.data,
        description: enhancedDescription,
        start: {
          dateTime: formattedStartTime,
          timeZone: timeZone,
        },
        end: {
          dateTime:
            Number(bufferTimeBetweenMeetings) > 0
              ? formattedBufferEndTime
              : formattedActualEndTime,
          timeZone: timeZone,
        },
      };

      // Update the event in the calendar
      const response = await calendarClient.updateEvent(
        defaultCalendarId,
        appointmentId,
        updatedEvent
      );

      if (!response || !response.data) {
        throw new Error("Failed to update calendar event");
      }

      // Format dates for display
      const formalDate = format(parsedStartTime, "EEEE, MMMM d, yyyy");
      const formalTime = format(parsedStartTime, "h:mm a");

      const appointmentDetails = {
        id: response.data.id,
        title: response.data.summary || "Appointment",
        date: format(parsedStartTime, "yyyy-MM-dd"),
        time: format(parsedStartTime, "HH:mm"),
        duration: appointmentDuration,
        bufferTime: Number(bufferTimeBetweenMeetings),
        link: response.data.htmlLink || "",
        calendarId: defaultCalendarId,
      };

      // Update appointment in our database
      try {
        // First find if we have this appointment already stored
        const existingAppointment = await prisma.appointment.findFirst({
          where: {
            externalEventId: appointmentId,
            calendarProvider: "google",
          },
        });

        // If found, update it
        if (existingAppointment) {
          // Process organizer data
          let organizerData = undefined;
          if (response.data.organizer?.email) {
            organizerData = {
              email: response.data.organizer.email,
              name: response.data.organizer.displayName || "",
            };
          }

          // Process attendees data - filter out any attendees without email
          const attendeesData =
            response.data.attendees
              ?.filter(
                (
                  attendee
                ): attendee is {
                  email: string;
                  displayName?: string;
                  responseStatus?: string;
                } => typeof attendee.email === "string"
              )
              .map((attendee) => ({
                email: attendee.email,
                name: attendee.displayName || "",
                response: attendee.responseStatus || "",
              })) || [];

          // Ensure description is string or undefined (not null)
          const safeDescription =
            typeof response.data.description === "string"
              ? response.data.description
              : undefined;

          await prisma.appointment.update({
            where: { id: existingAppointment.id },
            data: {
              title: response.data.summary || "Appointment",
              description: safeDescription,
              startTime: parsedStartTime,
              endTime: actualMeetingEndTime,
              timeZone: timeZone,
              organizer: organizerData
                ? JSON.parse(JSON.stringify(organizerData))
                : null,
              attendees: attendeesData.length
                ? JSON.parse(JSON.stringify(attendeesData))
                : null,
              status: response.data.status || "confirmed",
              properties: {
                eventId: response.data.id,
                iCalUID: response.data.iCalUID,
                appointmentDuration,
                bufferTime: bufferTimeBetweenMeetings,
                rescheduled: true,
                originalStartTime: existingAppointment.startTime,
              },
              updatedAt: new Date(),
            },
          });
        } else {
          // If not found, store it as a new appointment
          const { storeCalendarAppointment } = await import(
            "../appointment-core/appointment-integration"
          );

          // Process organizer data
          let organizerData = undefined;
          if (response.data.organizer?.email) {
            organizerData = {
              email: response.data.organizer.email,
              name: response.data.organizer.displayName || "",
            };
          }

          // Process attendees data - filter out any attendees without email
          const attendeesData =
            response.data.attendees
              ?.filter(
                (
                  attendee
                ): attendee is {
                  email: string;
                  displayName?: string;
                  responseStatus?: string;
                } => typeof attendee.email === "string"
              )
              .map((attendee) => ({
                email: attendee.email,
                name: attendee.displayName || "",
                response: attendee.responseStatus || "",
              })) || [];

          await storeCalendarAppointment({
            botId: context.botId,
            conversationId: context.conversationId,
            calendarProvider: "google",
            calendarId: defaultCalendarId,
            externalEventId: response.data.id || undefined,
            title: response.data.summary || "Appointment",
            description: response.data.description || "",
            startTime: parsedStartTime,
            endTime: actualMeetingEndTime,
            timeZone: timeZone,
            organizer: organizerData,
            attendees: attendeesData,
            meetingLink: response.data.htmlLink || "",
            status: response.data.status || "confirmed",
            properties: {
              eventId: response.data.id,
              iCalUID: response.data.iCalUID,
              appointmentDuration,
              bufferTime: bufferTimeBetweenMeetings,
              rescheduled: true,
            },
            metadata: {
              source: "google-calendar-tool",
              rescheduled: true,
              rescheduledAt: new Date().toISOString(),
            },
          });
        }
      } catch (storageError) {
        // Log error but don't fail the appointment update
        console.error("Error updating appointment in database:", storageError);
      }

      return {
        success: true,
        appointmentId: response.data.id,
        appointmentDetails,
        message: `Successfully rescheduled appointment to ${formalDate} at ${formalTime}`,
      };
    } catch (error) {
      console.error("Error rescheduling appointment:", error);
      // Extract the Google API error details if available
      const apiError = error as GoogleApiError;
      const errorMessage =
        apiError.errors?.map((e) => e.message).join(", ") ||
        (error instanceof Error ? error.message : String(error));

      return {
        success: false,
        error: {
          code: "RESCHEDULE_FAILED",
          message: `Failed to reschedule appointment: ${errorMessage}`,
        },
      };
    }
  },
};

export const cancelAppointment: ToolFunction = {
  description: "Cancel an existing appointment on Google Calendar",
  parameters: cancelAppointmentSchema,
  execute: async (params, context) => {
    try {
      // Get the calendar API client
      const calendarClient = await getGoogleCalendarClient(context);

      // Get config from context
      const config = (context.config || {}) as CalendarConfig;
      const defaultCalendarId = config.defaultCalendarId || "primary";

      // Extract parameters
      const { appointmentId, reason } = params as {
        appointmentId: string;
        reason?: string;
      };

      // First, get the event to store information for the response
      let existingEvent;
      try {
        existingEvent = await calendarClient.getEvent(
          defaultCalendarId,
          appointmentId
        );
      } catch (err: unknown) {
        // Handle case when event doesn't exist
        const error = err as { response?: { status?: number } };
        if (error.response?.status === 404) {
          return {
            success: false,
            error: {
              code: "EVENT_NOT_FOUND",
              message: `Appointment with ID ${appointmentId} not found in calendar ${defaultCalendarId}`,
            },
          };
        }
        throw err;
      }

      // If event doesn't exist or response is invalid, return error
      if (!existingEvent || !existingEvent.data) {
        return {
          success: false,
          error: {
            code: "EVENT_NOT_FOUND",
            message: `Appointment with ID ${appointmentId} not found in calendar ${defaultCalendarId}`,
          },
        };
      }

      // Store event details for response
      const eventTitle = existingEvent.data.summary || "Unknown Event";

      console.log("Cancelling event:", {
        id: appointmentId,
        title: eventTitle,
        calendar: defaultCalendarId,
      });

      // Cancel the event
      await calendarClient.deleteEvent(defaultCalendarId, appointmentId, {
        sendUpdates: "all", // Send cancellation emails to attendees
      });

      // Update appointment in our database
      try {
        // Dynamic import to avoid circular dependencies
        const { findAppointmentByExternalId, updateAppointmentStatus } =
          await import("../appointment-core/appointment-storage");

        // Find appointment in database
        const appointmentResult = await findAppointmentByExternalId(
          appointmentId,
          "google"
        );

        // If found, update it to mark as cancelled
        if (appointmentResult.success && appointmentResult.data) {
          // Create new properties object without spread
          const updatedProperties: Record<string, unknown> = {
            cancelReason: reason || "No reason provided",
            cancelledAt: new Date().toISOString(),
          };

          // Add existing properties if available
          if (
            appointmentResult.data.properties &&
            typeof appointmentResult.data.properties === "object"
          ) {
            Object.entries(
              appointmentResult.data.properties as Record<string, unknown>
            ).forEach(([key, value]) => {
              updatedProperties[key] = value;
            });
          }

          await updateAppointmentStatus(
            appointmentResult.data.id,
            "cancelled",
            updatedProperties
          );
        }
        // If not found in database, no need to update anything
      } catch (storageError) {
        // Log error but don't fail the appointment cancellation
        console.error("Error updating appointment in database:", storageError);
      }

      const cancellationMessage = reason
        ? `Successfully cancelled appointment: ${eventTitle} (Reason: ${reason})`
        : `Successfully cancelled appointment: ${eventTitle}`;

      return {
        success: true,
        appointmentId,
        message: cancellationMessage,
      };
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      // Extract the Google API error details if available
      const apiError = error as GoogleApiError;
      const errorMessage =
        apiError.errors?.map((e) => e.message).join(", ") ||
        (error instanceof Error ? error.message : String(error));

      return {
        success: false,
        error: {
          code: "CANCELLATION_FAILED",
          message: `Failed to cancel appointment: ${errorMessage}`,
        },
      };
    }
  },
};

export const listAppointments: ToolFunction = {
  description: "List upcoming appointments on Google Calendar",
  parameters: listAppointmentsSchema,
  execute: async (params, context) => {
    try {
      // Get the calendar API client
      const calendarClient = await getGoogleCalendarClient(context);

      // Get config from context
      const config = (context.config || {}) as CalendarConfig;
      const defaultCalendarId = config.defaultCalendarId || "primary";
      const availabilityWindowDays = config.availabilityWindowDays || 14;

      // Extract and validate parameters
      const {
        startDate,
        endDate,
        maxResults = 10,
        userTimeZone, // eslint-disable-line @typescript-eslint/no-unused-vars
      } = params as {
        startDate?: string;
        endDate?: string;
        maxResults?: number;
        userTimeZone?: string;
      };

      // Note: userTimeZone is included for schema consistency but not used in this function
      // since we're only retrieving events from the calendar

      // Calculate date range (use configured availability window if not specified)
      const dateRange = getDateRange(
        startDate,
        endDate,
        availabilityWindowDays
      );

      console.log("Listing events:", {
        timeMin: dateRange.start,
        timeMax: dateRange.end,
        maxResults,
        calendar: defaultCalendarId,
      });

      // Get events
      const response = await calendarClient.listEvents(defaultCalendarId, {
        timeMin: dateRange.start,
        timeMax: dateRange.end,
        maxResults,
        singleEvents: true,
        orderBy: "startTime",
      });

      if (!response || !response.data || !response.data.items) {
        return {
          success: true,
          appointments: [],
          message: "No appointments found in the specified date range",
        };
      }

      // Format the events for the response
      const appointments = response.data.items
        .map((event) => {
          // Handle all-day events (date only) or regular events with dateTime
          const startTime = event.start?.dateTime || event.start?.date;
          const endTime = event.end?.dateTime || event.end?.date;

          if (!startTime) {
            return null; // Skip events with no start time
          }

          // Calculate duration in minutes if we have both start and end times
          let duration = 0;
          if (startTime && endTime) {
            const start = parseISO(startTime);
            const end = parseISO(endTime);
            duration = Math.round(
              (end.getTime() - start.getTime()) / (1000 * 60)
            );
          }

          // Parse the start date
          const startDate = parseISO(startTime);

          // Extract buffer time information if present in description
          let bufferTime = 0;
          const bufferMatch = event.description?.match(
            /Buffer time: (\d+) minutes/
          );
          if (bufferMatch && bufferMatch[1]) {
            bufferTime = parseInt(bufferMatch[1], 10);
          }

          // Adjust duration if buffer time is found
          if (bufferTime > 0 && duration > bufferTime) {
            duration -= bufferTime;
          }

          return {
            id: event.id || "",
            title: event.summary || "Untitled Event",
            date: format(startDate, "yyyy-MM-dd"),
            time: event.start?.dateTime
              ? format(startDate, "HH:mm")
              : "All day",
            duration,
            bufferTime,
            link: event.htmlLink || "",
            description: event.description || "",
            location: event.location || "",
          };
        })
        .filter(Boolean) as Array<{
        id: string;
        title: string;
        date: string;
        time: string;
        duration: number;
        bufferTime: number;
        link: string;
        description: string;
        location: string;
      }>; // Remove null entries and specify return type

      return {
        success: true,
        appointments,
        message:
          appointments.length > 0
            ? `Found ${appointments.length} appointment(s)`
            : "No appointments found in the specified date range",
      };
    } catch (error) {
      console.error("Error listing appointments:", error);
      // Extract the Google API error details if available
      const apiError = error as GoogleApiError;
      const errorMessage =
        apiError.errors?.map((e) => e.message).join(", ") ||
        (error instanceof Error ? error.message : String(error));

      return {
        success: false,
        error: {
          code: "LIST_FAILED",
          message: `Failed to list appointments: ${errorMessage}`,
        },
      };
    }
  },
};

export const listAvailableSlots: ToolFunction = {
  description:
    "List available time slots for scheduling appointments based on calendar availability and configured time slots",
  parameters: listAvailableSlotsSchema,
  execute: async (params, context) => {
    try {
      // Get the calendar API client
      const calendarClient = await getGoogleCalendarClient(context);

      // Get config from context
      const config = (context.config || {}) as CalendarConfig;
      const defaultCalendarId = config.defaultCalendarId || "primary";
      const appointmentDuration = config.appointmentDuration || 30;
      const bufferTimeBetweenMeetings = config.bufferTimeBetweenMeetings || 0;
      const availabilityWindowDays = config.availabilityWindowDays || 14;

      // Use configured availableTimeSlots to determine which days and times are available
      // Only days with a configuration in availableTimeSlots will be considered
      const availableTimeSlots = config.availableTimeSlots || [
        { day: "monday", startTime: "09:00", endTime: "17:00" },
        { day: "tuesday", startTime: "09:00", endTime: "17:00" },
        { day: "wednesday", startTime: "09:00", endTime: "17:00" },
        { day: "thursday", startTime: "09:00", endTime: "17:00" },
        { day: "friday", startTime: "09:00", endTime: "17:00" },
      ];

      // Extract parameters for listAvailableSlots
      const {
        startDate,
        endDate,
        interval = 30,
        userTimeZone,
      } = params as {
        startDate?: string;
        endDate?: string;
        interval?: number;
        userTimeZone?: string;
      };

      console.log("Listing available slots params:", {
        startDate,
        endDate,
        interval,
        appointmentDuration, // Log configured duration
      });

      // Use userTimeZone if provided, otherwise fall back to config.timeZone or default
      const timeZoneOfUser =
        userTimeZone || config.timeZone || DEFAULT_TIME_ZONE;

      // Calculate date range
      const dateTimeRangeInUserTimeZone = getDateTimeRangeInUserTimeZone({
        startDate,
        endDate,
        userTimeZone: timeZoneOfUser,
        availabilityWindowDays,
      });
      const startDateTime = parseISO(dateTimeRangeInUserTimeZone.start);
      const endDateTime = parseISO(dateTimeRangeInUserTimeZone.end);

      // Get all days in the range
      const daysInRange = eachDayOfInterval({
        start: startDateTime,
        end: endDateTime,
      });

      // Fetch existing events for the date range
      const response = await calendarClient.listEvents(defaultCalendarId, {
        timeMin: dateTimeRangeInUserTimeZone.start,
        timeMax: dateTimeRangeInUserTimeZone.end,
        singleEvents: true,
        orderBy: "startTime",
      });

      // Convert existing events to time ranges
      const existingEvents =
        response.data.items
          ?.map((event) => {
            if (!event) return null;

            const start = event.start?.dateTime
              ? parseISO(event.start.dateTime)
              : null;
            const end = event.end?.dateTime
              ? parseISO(event.end.dateTime)
              : null;

            // Skip events without proper start/end times
            if (!start || !end) {
              return null;
            }

            return { start, end };
          })
          .filter(
            (event): event is { start: Date; end: Date } => event !== null
          ) || [];

      // Helper function to check if a time slot overlaps with existing events
      const isTimeSlotFree = (slotStart: Date, slotEnd: Date) => {
        // Account for buffer time before and after
        const slotWithBuffer = {
          start: addMinutes(slotStart, -bufferTimeBetweenMeetings),
          end: addMinutes(slotEnd, bufferTimeBetweenMeetings),
        };

        // Check against all existing events
        return !existingEvents.some((event) =>
          areIntervalsOverlapping(
            { start: event.start, end: event.end },
            slotWithBuffer
          )
        );
      };

      // Generate available time slots
      const availableSlots: {
        date: string;
        day: string;
        startTime: string;
        endTime: string;
        iso8601: string;
        durationMinutes: number;
        timeZone: string;
      }[] = [];

      // Calculate the current time plus 1 hour to avoid suggesting slots in the very near future
      const minimumStartTime = addMinutes(new Date(), 60);

      console.log({
        existingEvents,
      });

      // Generate available time slots
      for (const day of daysInRange) {
        // Get the day name in config.timeZone
        const configDay = formatInTimeZone(
          day,
          config.timeZone || DEFAULT_TIME_ZONE,
          "EEEE"
        ).toLowerCase();
        const slotConfig = availableTimeSlots.find(
          (slot) => slot.day.toLowerCase() === configDay
        );
        if (!slotConfig) continue;

        // Parse slot start and end in config.timeZone
        const slotStartConfig = formatInTimeZone(
          day,
          config.timeZone || DEFAULT_TIME_ZONE,
          `yyyy-MM-dd'T'${slotConfig.startTime}:00XXX`
        );
        const slotEndConfig = formatInTimeZone(
          day,
          config.timeZone || DEFAULT_TIME_ZONE,
          `yyyy-MM-dd'T'${slotConfig.endTime}:00XXX`
        );
        const slotStart = parseISO(slotStartConfig);
        const slotEnd = parseISO(slotEndConfig);

        // Convert slot start/end to user's timezone for display
        let current = slotStart;
        while (addMinutes(current, appointmentDuration) <= slotEnd) {
          const slotEndTime = addMinutes(current, appointmentDuration);
          // Only show slots in the future (with 1 hour buffer)
          if (current < minimumStartTime) {
            current = addMinutes(current, interval);
            continue;
          }
          // Check for overlap
          if (isTimeSlotFree(current, slotEndTime)) {
            // Format for user timezone
            const userSlotStart = formatInTimeZone(
              current,
              timeZoneOfUser,
              "yyyy-MM-dd'T'HH:mm:ssXXX"
            );
            availableSlots.push({
              date: formatInTimeZone(current, timeZoneOfUser, "yyyy-MM-dd"),
              day: formatInTimeZone(current, timeZoneOfUser, "EEEE"),
              startTime: formatInTimeZone(current, timeZoneOfUser, "HH:mm"),
              endTime: formatInTimeZone(slotEndTime, timeZoneOfUser, "HH:mm"),
              iso8601: userSlotStart,
              durationMinutes: appointmentDuration,
              timeZone: timeZoneOfUser,
            });
          }
          current = addMinutes(current, interval);
        }
      }

      return {
        success: true,
        availableSlots,
        message:
          availableSlots.length > 0
            ? `Found ${availableSlots.length} available time slots`
            : "No available time slots found for the specified criteria",
      };
    } catch (error) {
      console.error("Error listing available slots:", error);
      // Extract the Google API error details if available
      const apiError = error as GoogleApiError;
      const errorMessage =
        apiError.errors?.map((e) => e.message).join(", ") ||
        (error instanceof Error ? error.message : String(error));

      return {
        success: false,
        error: {
          code: "LIST_SLOTS_FAILED",
          message: `Failed to list available time slots: ${errorMessage}`,
        },
      };
    }
  },
};
