import { ToolFunction } from "../definitions/tool-interface";
import {
  bookAppointmentSchema,
  rescheduleAppointmentSchema,
  cancelAppointmentSchema,
  listAppointmentsSchema,
} from "./schema";
import { getGoogleCalendarClient } from "./services/credentials-service";
import { getDateRange } from "./utils/date-utils";
import { parseISO, format, isValid, formatISO } from "date-fns";

// Type for Google API errors
interface GoogleApiError {
  code: number;
  errors?: Array<{ message: string }>;
  message?: string;
}

export const bookAppointment: ToolFunction = {
  description: "Book a new appointment on Google Calendar",
  parameters: bookAppointmentSchema,
  execute: async (params, context) => {
    try {
      // Get the calendar API client
      const calendarClient = await getGoogleCalendarClient(context);

      // Get config from context
      const config = context.config || {};
      const { appointmentDuration = 30 } = config;

      // Extract parameters with defaults
      const {
        title,
        description = "",
        startTime,
        duration = appointmentDuration,
      } = params as {
        title: string;
        description?: string;
        startTime?: string;
        duration?: number;
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

      // Validate start time
      const parsedStartTime = parseISO(startTime);
      if (!isValid(parsedStartTime)) {
        return {
          success: false,
          error: {
            code: "INVALID_START_TIME",
            message:
              "Invalid start time format. Please use ISO 8601 format (e.g., 2023-11-15T10:00:00Z).",
          },
        };
      }

      // Ensure the time is not in the past
      if (parsedStartTime < new Date()) {
        return {
          success: false,
          error: {
            code: "START_TIME_IN_PAST",
            message: "Start time cannot be in the past.",
          },
        };
      }

      // Format dates in RFC3339 format (required by Google Calendar API)
      const formattedStartTime = formatISO(parsedStartTime);

      // Calculate end time from start time and duration
      const endTimeDate = new Date(
        parsedStartTime.getTime() + Number(duration) * 60 * 1000
      );
      const formattedEndTime = formatISO(endTimeDate);

      // Create the event
      const event = {
        summary: title,
        description,
        start: {
          dateTime: formattedStartTime,
          timeZone: "Etc/UTC", // Using UTC for consistency
        },
        end: {
          dateTime: formattedEndTime,
          timeZone: "Etc/UTC", // Using UTC for consistency
        },
        reminders: {
          useDefault: true,
        },
      };

      console.log("Creating event with:", {
        start: event.start,
        end: event.end,
      });

      // Insert the event into the calendar
      const response = await calendarClient.events.insert({
        calendarId: "primary", // Using primary calendar
        requestBody: event,
      });

      if (!response.data || !response.data.id) {
        throw new Error("Failed to create calendar event");
      }

      // Format start and end times for response
      const formalDate = format(parsedStartTime, "EEEE, MMMM d, yyyy");
      const formalTime = format(parsedStartTime, "h:mm a");

      return {
        success: true,
        appointmentId: response.data.id,
        appointmentDetails: {
          id: response.data.id,
          title: response.data.summary,
          date: format(parsedStartTime, "yyyy-MM-dd"),
          time: format(parsedStartTime, "HH:mm"),
          duration: Number(duration),
          link: response.data.htmlLink,
        },
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

      // Extract parameters
      const { appointmentId, startTime, duration } = params as {
        appointmentId: string;
        startTime?: string;
        duration?: number;
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

      // Validate start time
      const parsedStartTime = parseISO(startTime);
      if (!isValid(parsedStartTime)) {
        return {
          success: false,
          error: {
            code: "INVALID_START_TIME",
            message:
              "Invalid start time format. Please use ISO 8601 format (e.g., 2023-11-15T10:00:00Z).",
          },
        };
      }

      // Ensure the time is not in the past
      if (parsedStartTime < new Date()) {
        return {
          success: false,
          error: {
            code: "START_TIME_IN_PAST",
            message: "Start time cannot be in the past.",
          },
        };
      }

      // First, get the existing event
      const existingEvent = await calendarClient.events.get({
        calendarId: "primary",
        eventId: appointmentId,
      });

      if (!existingEvent.data) {
        throw new Error(`Appointment with ID ${appointmentId} not found`);
      }

      // Format dates in RFC3339 format (required by Google Calendar API)
      const formattedStartTime = formatISO(parsedStartTime);

      // Calculate duration from existing event description or use provided duration
      const durationToUse =
        duration ||
        (existingEvent.data.description?.match(/Duration: (\d+)/)
          ? parseInt(
              existingEvent.data.description.match(/Duration: (\d+)/)?.[1] ||
                "30",
              10
            )
          : 30);

      // Calculate end time based on new start time and duration
      const endTimeDate = new Date(
        parsedStartTime.getTime() + Number(durationToUse) * 60 * 1000
      );
      const formattedEndTime = formatISO(endTimeDate);

      // Prepare the updated event
      const updatedEvent = {
        ...existingEvent.data,
        start: {
          dateTime: formattedStartTime,
          timeZone: "Etc/UTC",
        },
        end: {
          dateTime: formattedEndTime,
          timeZone: "Etc/UTC",
        },
      };

      console.log("Updating event with:", {
        id: appointmentId,
        start: updatedEvent.start,
        end: updatedEvent.end,
      });

      // Update the event
      const response = await calendarClient.events.update({
        calendarId: "primary",
        eventId: appointmentId,
        requestBody: updatedEvent,
      });

      if (!response.data) {
        throw new Error("Failed to update calendar event");
      }

      // Format start date/time for response
      const formalDate = format(parsedStartTime, "EEEE, MMMM d, yyyy");
      const formalTime = format(parsedStartTime, "h:mm a");

      return {
        success: true,
        appointmentId: response.data.id,
        appointmentDetails: {
          id: response.data.id,
          title: response.data.summary,
          date: format(parsedStartTime, "yyyy-MM-dd"),
          time: format(parsedStartTime, "HH:mm"),
          duration: durationToUse,
          link: response.data.htmlLink,
        },
        message: `Successfully rescheduled appointment: ${response.data.summary} to ${formalDate} at ${formalTime}`,
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

      // Extract parameters
      const { appointmentId, reason } = params as {
        appointmentId: string;
        reason?: string;
      };

      // First, get the event to store information for the response
      const existingEvent = await calendarClient.events
        .get({
          calendarId: "primary",
          eventId: appointmentId,
        })
        .catch((err) => {
          // Handle case when event doesn't exist
          if (err.response?.status === 404) {
            return { data: null };
          }
          throw err;
        });

      // If event doesn't exist, return appropriate message
      if (!existingEvent.data) {
        return {
          success: false,
          error: {
            code: "EVENT_NOT_FOUND",
            message: `Appointment with ID ${appointmentId} not found`,
          },
        };
      }

      // Store event details for response
      const eventTitle = existingEvent.data.summary || "Unknown Event";

      console.log("Cancelling event:", {
        id: appointmentId,
        title: eventTitle,
      });

      // Cancel the event
      await calendarClient.events.delete({
        calendarId: "primary",
        eventId: appointmentId,
        sendUpdates: "all", // Send cancellation emails to attendees
      });

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

      // Extract and validate parameters
      const {
        startDate,
        endDate,
        maxResults = 10,
      } = params as {
        startDate?: string;
        endDate?: string;
        maxResults?: number;
      };

      // Calculate date range
      const dateRange = getDateRange(startDate, endDate);

      console.log("Listing events:", {
        timeMin: dateRange.start,
        timeMax: dateRange.end,
        maxResults,
      });

      // Get events
      const response = await calendarClient.events.list({
        calendarId: "primary",
        timeMin: dateRange.start,
        timeMax: dateRange.end,
        maxResults,
        singleEvents: true,
        orderBy: "startTime",
      });

      if (!response.data.items) {
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

          return {
            id: event.id,
            title: event.summary || "Untitled Event",
            date: format(startDate, "yyyy-MM-dd"),
            time: event.start?.dateTime
              ? format(startDate, "HH:mm")
              : "All day",
            duration,
            link: event.htmlLink,
            description: event.description,
            location: event.location,
          };
        })
        .filter(Boolean); // Remove null entries

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
