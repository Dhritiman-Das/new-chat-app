import { ToolFunction } from "../definitions/tool-interface";
import {
  bookAppointmentSchema,
  rescheduleAppointmentSchema,
  cancelAppointmentSchema,
  listAppointmentsSchema,
  listAvailableSlotsSchema,
} from "./schema";
import { format, parseISO, addMinutes } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import prisma from "@/lib/db/prisma";
import { createClient } from "@/lib/auth/provider-registry";
import { GoHighLevelClient } from "@/lib/auth/clients/gohighlevel";
import { GoHighLevelWebhookPayload } from "@/lib/shared/types/gohighlevel";

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
      const {
        title,
        description = "",
        startTime,
        contactId: paramContactId,
        userTimeZone,
      } = params as {
        title: string;
        description?: string;
        startTime: string;
        contactId?: string;
        userTimeZone?: string;
      };

      // Use contactId from webhook payload if available, otherwise use param contactId
      const contactId = webhookPayload?.contactId || paramContactId;

      if (!contactId) {
        return {
          success: false,
          error: {
            code: "MISSING_CONTACT_ID",
            message: "Contact ID is required to book an appointment",
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

      // Create appointment using the calendar client
      const appointmentPayload = {
        calendarId,
        title,
        startTime: startTimeFormatted,
        endTime: endTimeFormatted,
        contactId,
        locationId,
        meetingLocationType: "custom" as const,
        address: description || "Appointment via Chat Assistant",
        appointmentStatus: "confirmed" as const,
      };

      const response = await ghlClient.calendar.createAppointment(
        appointmentPayload
      );

      if (!response || !response.id) {
        throw new Error("Failed to create calendar appointment");
      }

      // Format start time for response
      const formalDate = format(parsedStartTime, "EEEE, MMMM d, yyyy");
      const formalTime = format(parsedStartTime, "h:mm a");

      // Store appointment in database
      try {
        // Dynamic import to avoid circular dependencies
        const { storeCalendarAppointment } = await import(
          "../appointment-core/appointment-integration"
        );

        await storeCalendarAppointment({
          botId: context.botId,
          conversationId: context.conversationId,
          calendarId,
          externalEventId: response.id,
          calendarProvider: "gohighlevel",
          title,
          description: description || "",
          startTime: parsedStartTime,
          endTime,
          timeZone,
          organizer: {
            name: "GoHighLevel Calendar",
            email: "noreply@gohighlevel.com",
          },
          attendees: [],
          metadata: {
            source: "chat",
            locationId,
            contactId,
          },
        });
      } catch (dbError) {
        console.error("Failed to store appointment in database:", dbError);
        // Continue execution as this is not critical
      }

      return {
        success: true,
        data: {
          appointmentId: response.id,
          title,
          date: formalDate,
          time: formalTime,
          duration: appointmentDuration,
          status: "confirmed",
          message: `Appointment booked successfully for ${formalDate} at ${formalTime}.`,
        },
      };
    } catch (error) {
      console.error("Error booking GoHighLevel appointment:", error);
      const apiError = error as GHLApiError;
      return {
        success: false,
        error: {
          code: "BOOKING_FAILED",
          message:
            apiError.message ||
            "Failed to book appointment on GoHighLevel Calendar",
          details: apiError.details || "",
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
      await ghlClient.calendar.updateAppointment(eventId, updatePayload);

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
  description: "List upcoming appointments from GoHighLevel Calendar",
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

      // Get the GoHighLevel client
      const ghlClient = await createClient<GoHighLevelClient>(tokenContext);

      // Get config from context
      const config = (context.config || {}) as CalendarConfig;

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

      // Extract parameters with defaults
      const {
        startDate,
        endDate,
        maxResults = 10,
        userTimeZone,
        contactId: paramContactId,
      } = params as {
        startDate?: string;
        endDate?: string;
        maxResults?: number;
        userTimeZone?: string;
        contactId?: string;
      };

      // Use contactId from webhook payload if available, otherwise use param contactId
      const contactId = webhookPayload?.contactId || paramContactId;

      // Use userTimeZone if provided, otherwise fall back to config.timeZone or default
      const timeZone = userTimeZone || config.timeZone || DEFAULT_TIME_ZONE;

      // Convert start and end dates to timestamps if provided
      const now = Date.now();
      const startTimestamp = startDate ? parseInt(startDate) : now;
      const endTimestamp = endDate
        ? parseInt(endDate)
        : now + 7 * 24 * 60 * 60 * 1000; // Default to 7 days in the future

      // Fetch events from the API using the calendar client
      const events = await ghlClient.calendar.getCalendarEvents(
        startTimestamp,
        endTimestamp,
        { calendarId }
      );

      // Filter events by contactId if provided
      const filteredEvents = contactId
        ? events.filter((event) => event.contactId === contactId)
        : events;

      // Filter and format appointments
      const relevantEvents = filteredEvents
        .filter((event) => event.appointmentStatus !== "cancelled")
        .slice(0, maxResults);

      if (relevantEvents.length === 0) {
        return {
          success: true,
          data: {
            appointments: [],
            message: "No upcoming appointments found",
          },
        };
      }

      // Format appointments
      const formattedAppointments = relevantEvents.map((event) => {
        // Parse event date for formatting
        const eventDate = new Date(event.startTime);

        const formattedDate = formatInTimeZone(
          eventDate,
          timeZone,
          "EEEE, MMMM d, yyyy"
        );
        const formattedTime = formatInTimeZone(eventDate, timeZone, "h:mm a");

        return {
          id: event.id,
          title: event.title || "Appointment",
          date: formattedDate,
          time: formattedTime,
          status: event.appointmentStatus || "confirmed",
          contactId: event.contactId,
          address: event.address,
          isRecurring: event.isRecurring || false,
          notes: event.notes,
        };
      });

      return {
        success: true,
        data: {
          appointments: formattedAppointments,
          message: `Found ${formattedAppointments.length} appointment(s)`,
        },
      };
    } catch (error) {
      console.error("Error listing GoHighLevel appointments:", error);
      const apiError = error as GHLApiError;
      return {
        success: false,
        error: {
          code: "LISTING_FAILED",
          message:
            apiError.message ||
            "Failed to list appointments from GoHighLevel Calendar",
          details: apiError.details || "",
        },
      };
    }
  },
};

export const listAvailableSlots: ToolFunction = {
  description: "List available time slots on GoHighLevel Calendar",
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

      // Get locationId from webhook payload first, then from config
      const webhookPayload = context.webhookPayload as
        | GoHighLevelWebhookPayload
        | undefined;
      console.log("webhookPayload", webhookPayload);
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
      const {
        startDate,
        endDate,
        timezone,
        userId,
        enableLookBusy = false,
      } = params as {
        startDate?: string;
        endDate?: string;
        timezone?: string;
        userId?: string;
        enableLookBusy?: boolean;
      };

      // Use userTimeZone if provided, otherwise fall back to config.timeZone or default
      const timeZone = timezone || config.timeZone || DEFAULT_TIME_ZONE;

      // Calculate date range based on startDate/endDate strings or defaults
      const availabilityWindowDays = config.availabilityWindowDays || 14;
      const now = new Date();

      // Parse start date or use current date
      let startDateObj = now;
      if (startDate) {
        startDateObj = parseISO(startDate);
      }

      // Parse end date or use start date + availability window
      let endDateObj = addMinutes(
        startDateObj,
        availabilityWindowDays * 24 * 60
      );
      if (endDate) {
        endDateObj = parseISO(endDate);
      }

      // Convert dates to timestamps for API
      const startTimestamp = startDateObj.getTime();
      const endTimestamp = endDateObj.getTime();

      // Get available slots using the calendar client
      const slotsResponse = await ghlClient.calendar.getAvailableSlots(
        calendarId,
        startTimestamp,
        endTimestamp,
        {
          enableLookBusy,
          timezone: timeZone,
          userId,
        }
      );

      // Process the response which might be in the form of an object with dates as keys
      let availableSlots: string[] = [];

      // Check if response is an object with date keys (as shown in the example)
      if (
        slotsResponse &&
        typeof slotsResponse === "object" &&
        !Array.isArray(slotsResponse)
      ) {
        // Extract all slots from all dates
        Object.keys(slotsResponse).forEach((date) => {
          const dateValue = slotsResponse[date];
          // Make sure it's an object with slots property
          if (
            date !== "traceId" &&
            dateValue &&
            typeof dateValue === "object" &&
            "slots" in dateValue &&
            Array.isArray(dateValue.slots)
          ) {
            availableSlots = [
              ...availableSlots,
              ...(dateValue.slots as string[]),
            ];
          }
        });
      } else if (Array.isArray(slotsResponse)) {
        // If response is already an array of slots
        availableSlots = slotsResponse;
      }

      if (availableSlots.length === 0) {
        return {
          success: true,
          data: {
            slots: [],
            timeZone,
            message: "No available time slots found",
          },
        };
      }

      // Format slots for more friendly display
      const formattedSlots = availableSlots.map((slot: string) => {
        const slotDate = new Date(slot);
        return {
          iso: slot,
          date: formatInTimeZone(slotDate, timeZone, "EEEE, MMMM d, yyyy"),
          time: formatInTimeZone(slotDate, timeZone, "h:mm a"),
          formatted: formatInTimeZone(
            slotDate,
            timeZone,
            "EEEE, MMMM d, yyyy 'at' h:mm a"
          ),
        };
      });

      return {
        success: true,
        data: {
          slots: formattedSlots,
          timeZone,
          message: `Found ${formattedSlots.length} available time slot(s)`,
        },
      };
    } catch (error) {
      console.error("Error listing GoHighLevel available slots:", error);
      const apiError = error as GHLApiError;
      return {
        success: false,
        error: {
          code: "SLOTS_LISTING_FAILED",
          message:
            apiError.message ||
            "Failed to list available slots from GoHighLevel Calendar",
          details: apiError.details || "",
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
