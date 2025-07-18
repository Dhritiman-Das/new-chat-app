import { ToolFunction } from "../definitions/tool-interface";
import {
  bookAppointmentSchema,
  rescheduleAppointmentSchema,
  cancelAppointmentSchema,
  listAppointmentsSchema,
  listAvailableSlotsSchema,
} from "./schema";
import {
  format,
  parseISO,
  addMinutes,
  eachDayOfInterval,
  areIntervalsOverlapping,
  formatISO,
} from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import prisma from "@/lib/db/prisma";
import { createClient } from "@/lib/auth/provider-registry";
import type { GoHighLevelClient } from "@/lib/auth/clients/gohighlevel/index";
import type { CalendarEvent } from "@/lib/auth/clients/gohighlevel/calendar";
import { GoHighLevelWebhookPayload } from "@/lib/shared/types/gohighlevel";
import {
  getDateRange,
  getDateTimeRangeInUserTimeZone,
} from "../google-calendar/utils/date-utils";
import {
  AppointmentValidationError,
  validateAppointmentTime,
} from "../google-calendar/utils/validation-utils";

// Type for GoHighLevel API errors
interface GHLApiError {
  status?: number;
  message?: string;
  details?: string;
}

// Type for config
interface CalendarConfig {
  locationId?: string;
  defaultCalendarId?: string;
  appointmentDuration?: number;
  availabilityWindowDays?: number;
  bufferTimeBetweenMeetings?: number;
  availableTimeSlots?: Array<{
    day: string;
    startTime: string;
    endTime: string;
  }>;
  timeZone?: string;
}

const DEFAULT_TIME_ZONE = "America/New_York";

export const bookAppointment: ToolFunction = {
  description: "Book a new appointment on GoHighLevel Calendar",
  parameters: bookAppointmentSchema,
  execute: async (params, context) => {
    try {
      // Create token context
      const tokenContext = {
        userId: context.userId || "",
        provider: "gohighlevel",
        credentialId: context.credentialId,
        botId: context.botId,
      };

      // Get the GoHighLevel client
      const ghlClient = await createClient<GoHighLevelClient>(tokenContext);

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

      if (!context.webhookPayload?.contactId) {
        return {
          success: false,
          error: {
            code: "MISSING_CONTACT_ID",
            message: "Contact ID is required to book an appointment",
          },
        };
      }
      // Insert the event into the calendar
      const response = await ghlClient.calendar.createAppointment({
        calendarId: defaultCalendarId,
        startTime: formattedStartTime,
        endTime:
          Number(bufferTimeBetweenMeetings) > 0
            ? formattedBufferEndTime
            : formattedActualEndTime,
        title,
        description: enhancedDescription,
        appointmentStatus: "confirmed",
        contactId: context.webhookPayload?.contactId as string,
      });

      if (!response) {
        throw new Error("Failed to create calendar event");
      }

      // Format start and end times for response
      const formalDate = format(parsedStartTime, "EEEE, MMMM d, yyyy");
      const formalTime = format(parsedStartTime, "h:mm a");

      // Extract event details for storage
      const appointmentDetails = {
        id: response.id,
        title: response.summary || title,
        date: format(parsedStartTime, "yyyy-MM-dd"),
        time: format(parsedStartTime, "HH:mm"),
        duration: appointmentDuration,
        bufferTime: Number(bufferTimeBetweenMeetings),
        link: response.htmlLink || "",
        calendarId: defaultCalendarId,
      };

      // Store appointment in our database
      try {
        // Dynamic import to avoid circular dependencies
        const { storeCalendarAppointment } = await import(
          "../appointment-core/appointment-integration"
        );

        // Process organizer data
        // TODO: Get the organizer's name and email from the GoHighLevel API using the response.assignedUserId
        // let organizerData = undefined;
        // if (response.assignedUserId) {
        //   organizerData = {
        //     assignedUserId: response.assignedUserId,
        //   };
        // }

        await storeCalendarAppointment({
          botId: context.botId,
          conversationId: context.conversationId,
          calendarProvider: "gohighlevel",
          calendarId: defaultCalendarId,
          externalEventId: response.id || undefined,
          title,
          description,
          startTime: parsedStartTime,
          endTime: actualMeetingEndTime,
          timeZone: timeZone,
          organizer: undefined,
          attendees: [],
          meetingLink: "",
          status: "confirmed",
          properties: {
            eventId: response.id,
            iCalUID: undefined,
            appointmentDuration,
            bufferTime: bufferTimeBetweenMeetings,
          },
          metadata: {
            source: "gohighlevel-calendar-tool",
            created: new Date().toISOString(),
          },
        });
      } catch (storageError) {
        // Log error but don't fail the appointment booking
        console.error("Error storing appointment in database:", storageError);
      }

      return {
        success: true,
        appointmentId: response.id,
        appointmentDetails,
        message: `Successfully booked appointment: ${title} on ${formalDate} at ${formalTime}`,
      };
    } catch (error) {
      console.error("Error booking appointment:", error);
      // Extract the GoHighLevel API error details if available
      const apiError = error as GHLApiError;
      const errorMessage =
        apiError.message ||
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

export const cancelAppointment: ToolFunction = {
  description: "Cancel an existing appointment on GoHighLevel Calendar",
  parameters: cancelAppointmentSchema,
  execute: async (params, context) => {
    try {
      // Create token context
      const tokenContext = {
        userId: context.userId || "",
        provider: "gohighlevel",
        credentialId: context.credentialId,
        botId: context.botId,
      };

      // Get the GoHighLevel client
      const ghlClient = await createClient<GoHighLevelClient>(tokenContext);

      // Get config from context
      const config = (context.config || {}) as CalendarConfig;

      // Get locationId from webhook payload first, then from config
      const webhookPayload = context.webhookPayload as
        | GoHighLevelWebhookPayload
        | undefined;
      const locationId = webhookPayload?.locationId || config.locationId;

      if (!locationId) {
        return {
          success: false,
          error: {
            code: "MISSING_LOCATION_ID",
            message: "Location ID is required in tool configuration",
          },
        };
      }

      // Extract parameters
      const { eventId, reason } = params as {
        eventId: string;
        reason?: string;
      };

      // First, check if the appointment exists
      try {
        const appointment = await ghlClient.calendar.getAppointment(eventId);
        if (!appointment) {
          return {
            success: false,
            error: {
              code: "APPOINTMENT_NOT_FOUND",
              message: `Appointment with ID ${eventId} not found`,
            },
          };
        }
      } catch (error) {
        console.error("Error checking appointment existence:", error);
        return {
          success: false,
          error: {
            code: "APPOINTMENT_NOT_FOUND",
            message: `Appointment with ID ${eventId} not found or could not be accessed`,
          },
        };
      }

      // Update appointment status to cancelled
      const updatePayload = {
        appointmentStatus: "cancelled" as const,
        // Include reason as note if needed
      };

      // Make API request to update appointment using the calendar client
      try {
        const response = await ghlClient.calendar.updateAppointment(
          eventId,
          updatePayload
        );
        if (!response) {
          throw new Error("Failed to update appointment");
        }
      } catch (error) {
        console.error("Error updating appointment:", error);
        return {
          success: false,
          error: {
            code: "UPDATE_FAILED",
            message: `Failed to update appointment: ${error}`,
          },
        };
      }

      // Update appointment in database
      try {
        await prisma.appointment.updateMany({
          where: {
            externalEventId: eventId,
            calendarProvider: "gohighlevel",
          },
          data: {
            status: "cancelled",
            metadata: {
              cancellationReason: reason || "Cancelled via Chat Assistant",
            },
          },
        });
      } catch (dbError) {
        console.error(
          "Failed to update appointment status in database:",
          dbError
        );
        // Continue execution as this is not critical
      }

      return {
        success: true,
        data: {
          appointmentId: eventId,
          status: "cancelled",
          message: `Appointment cancelled successfully${
            reason ? `: ${reason}` : "."
          }`,
        },
      };
    } catch (error) {
      console.error("Error cancelling GoHighLevel appointment:", error);
      const apiError = error as GHLApiError;
      return {
        success: false,
        error: {
          code: "CANCELLATION_FAILED",
          message:
            apiError.message ||
            "Failed to cancel appointment on GoHighLevel Calendar",
          details: apiError.details || "",
        },
      };
    }
  },
};

export const listAppointments: ToolFunction = {
  description: "List upcoming appointments on GoHighLevel Calendar",
  parameters: listAppointmentsSchema,
  execute: async (params, context) => {
    try {
      // Create token context
      const tokenContext = {
        userId: context.userId || "",
        provider: "gohighlevel",
        credentialId: context.credentialId,
        botId: context.botId,
      };
      // Get the calendar API client
      const ghlClient = await createClient<GoHighLevelClient>(tokenContext);

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

      // Get events. Convert to epoch (ms)
      const response = await ghlClient.calendar.getCalendarEvents(
        new Date(dateRange.start).getTime(),
        new Date(dateRange.end).getTime(),
        {
          calendarId: defaultCalendarId,
        }
      );

      if (!response) {
        return {
          success: true,
          appointments: [],
          message: "No appointments found in the specified date range",
        };
      }

      // Format the events for the response
      const appointments = response
        .map((event: CalendarEvent) => {
          // Handle all-day events (date only) or regular events with dateTime
          const startTime = event.startTime;
          const endTime = event.endTime;

          if (!startTime) {
            return null; // Skip events with no start time
          }

          // Calculate duration in minutes if we have both start and end times
          let duration = 0;
          if (startTime && endTime) {
            const start = parseISO(startTime as string);
            const end = parseISO(endTime as string);
            duration = Math.round(
              (end.getTime() - start.getTime()) / (1000 * 60)
            );
          }

          // Parse the start date
          const startDate = parseISO(startTime as string);

          // Extract buffer time information if present in description
          let bufferTime = 0;
          const bufferMatch = event.notes?.match(/Buffer time: (\d+) minutes/);
          if (bufferMatch && bufferMatch[1]) {
            bufferTime = parseInt(bufferMatch[1], 10);
          }

          // Adjust duration if buffer time is found
          if (bufferTime > 0 && duration > bufferTime) {
            duration -= bufferTime;
          }

          return {
            id: event.id || "",
            title: event.title || "Untitled Event",
            date: format(startDate, "yyyy-MM-dd"),
            time: event.startTime ? format(startDate, "HH:mm") : "All day",
            duration,
            bufferTime,
            link: "",
            description: event.notes || "",
            location: event.address || "",
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
      // Extract the GoHighLevel API error details if available
      const apiError = error as GHLApiError;
      const errorMessage =
        apiError.message ||
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
      // Create token context
      const tokenContext = {
        userId: context.userId || "",
        provider: "gohighlevel",
        credentialId: context.credentialId,
        botId: context.botId,
      };

      // Get the GoHighLevel client
      const ghlClient = await createClient<GoHighLevelClient>(tokenContext);

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

      const response = await ghlClient.calendar.getCalendarEvents(
        new Date(dateTimeRangeInUserTimeZone.start).getTime(),
        new Date(dateTimeRangeInUserTimeZone.end).getTime(),
        {
          calendarId: defaultCalendarId,
        }
      );

      // Convert existing events to time ranges
      const existingEvents =
        response
          ?.map((event: CalendarEvent) => {
            if (!event) return null;

            const start = event.startTime
              ? typeof event.startTime === "string"
                ? parseISO(event.startTime)
                : event.startTime
              : null;
            const end = event.endTime
              ? typeof event.endTime === "string"
                ? parseISO(event.endTime)
                : event.endTime
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
        return !existingEvents.some((event: { start: Date; end: Date }) =>
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
      // Extract the GoHighLevel API error details if available
      const apiError = error as GHLApiError;
      const errorMessage =
        apiError.message ||
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

export const rescheduleAppointment: ToolFunction = {
  description: "Reschedule an existing appointment on GoHighLevel Calendar",
  parameters: rescheduleAppointmentSchema,
  execute: async (params, context) => {
    try {
      // Create token context
      const tokenContext = {
        userId: context.userId || "",
        provider: "gohighlevel",
        credentialId: context.credentialId,
        botId: context.botId,
      };

      // Get the GoHighLevel client
      const ghlClient = await createClient<GoHighLevelClient>(tokenContext);

      // Get config from context
      const config = (context.config || {}) as CalendarConfig;
      const appointmentDuration = config.appointmentDuration || 30;

      // Get locationId from webhook payload first, then from config
      const webhookPayload = context.webhookPayload as
        | GoHighLevelWebhookPayload
        | undefined;
      const locationId = webhookPayload?.locationId || config.locationId;

      const calendarId = config.defaultCalendarId;

      if (!locationId) {
        return {
          success: false,
          error: {
            code: "MISSING_LOCATION_ID",
            message: "Location ID is required in tool configuration",
          },
        };
      }

      if (!calendarId) {
        return {
          success: false,
          error: {
            code: "MISSING_CALENDAR_ID",
            message: "Calendar ID is required in tool configuration",
          },
        };
      }

      // Extract parameters
      const { eventId, startTime, userTimeZone } = params as {
        eventId: string;
        startTime: string;
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

      // Parse the start time
      const parsedStartTime = parseISO(startTime);

      // Calculate end time from start time and duration
      const endTime = addMinutes(parsedStartTime, appointmentDuration);

      // Use userTimeZone if provided, otherwise fall back to config.timeZone or default
      const timeZone = userTimeZone || config.timeZone || DEFAULT_TIME_ZONE;

      // Format dates for API
      const startTimeFormatted = format(
        parsedStartTime,
        "yyyy-MM-dd'T'HH:mm:ssxxx"
      );
      const endTimeFormatted = format(endTime, "yyyy-MM-dd'T'HH:mm:ssxxx");

      // First, check if the existing appointment exists
      try {
        const appointment = await ghlClient.calendar.getAppointment(eventId);
        if (!appointment) {
          return {
            success: false,
            error: {
              code: "APPOINTMENT_NOT_FOUND",
              message: `Appointment with ID ${eventId} not found`,
            },
          };
        }
      } catch (error) {
        console.error("Error checking appointment existence:", error);
        return {
          success: false,
          error: {
            code: "APPOINTMENT_NOT_FOUND",
            message: `Appointment with ID ${eventId} not found or could not be accessed`,
          },
        };
      }

      // Update the appointment with new time
      const updatePayload = {
        startTime: startTimeFormatted,
        endTime: endTimeFormatted,
      };

      // Update the appointment using the calendar client
      const response = await ghlClient.calendar.updateAppointment(
        eventId,
        updatePayload
      );

      if (!response || !response.id) {
        throw new Error("Failed to reschedule appointment");
      }

      // Format start time for response
      const formalDate = format(parsedStartTime, "EEEE, MMMM d, yyyy");
      const formalTime = format(parsedStartTime, "h:mm a");

      // Update appointment in database if it exists
      try {
        const existingAppointment = await prisma.appointment.findFirst({
          where: {
            externalEventId: eventId,
            calendarProvider: "gohighlevel",
          },
        });

        if (existingAppointment) {
          await prisma.appointment.update({
            where: { id: existingAppointment.id },
            data: {
              startTime: parsedStartTime,
              endTime,
              timeZone,
              status: "confirmed",
              metadata: {
                rescheduled: true,
                rescheduledAt: new Date().toISOString(),
                originalStartTime: existingAppointment.startTime.toISOString(),
              },
              updatedAt: new Date(),
            },
          });
        }
      } catch (dbError) {
        console.error("Failed to update appointment in database:", dbError);
        // Continue execution as this is not critical
      }

      return {
        success: true,
        data: {
          appointmentId: response.id,
          title: response.title || "Appointment",
          date: formalDate,
          time: formalTime,
          status: "confirmed",
          message: `Appointment rescheduled successfully to ${formalDate} at ${formalTime}.`,
        },
      };
    } catch (error) {
      console.error("Error rescheduling GoHighLevel appointment:", error);
      const apiError = error as GHLApiError;
      return {
        success: false,
        error: {
          code: "RESCHEDULE_FAILED",
          message:
            apiError.message ||
            "Failed to reschedule appointment on GoHighLevel Calendar",
          details: apiError.details || "",
        },
      };
    }
  },
};
