import { z } from "zod";

// Configuration schema for GoHighLevel Calendar tool
export const gohighlevelCalendarConfigSchema = z.object({
  // locationId: z.string().describe("Location ID in GoHighLevel"),
  // defaultCalendarId: z
  //   .string()
  //   .describe("Default calendar ID to use for appointments"),
  appointmentDuration: z
    .number()
    .default(30)
    .describe("Default appointment duration in minutes"),
  availabilityWindowDays: z
    .number()
    .default(14)
    .describe("Number of days to show in availability window"),
  availableTimeSlots: z
    .array(
      z.object({
        day: z
          .enum([
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday",
          ])
          .describe("Day of week"),
        startTime: z
          .string()
          .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
          .describe("Start time (HH:MM)"),
        endTime: z
          .string()
          .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
          .describe("End time (HH:MM)"),
      })
    )
    .optional()
    .describe("Available time slots for appointments"),
  timeZone: z
    .string()
    .optional()
    .describe(
      "Default timezone for calendar operations. If provided, use IANA timezone identifiers."
    ),
});

// Credential schema for GoHighLevel Calendar
export const gohighlevelCalendarCredentialSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  token_type: z.string(),
  expiry_date: z.number().optional(),
});

// Function parameter schemas
export const bookAppointmentSchema = z.object({
  title: z.string().describe("Title of the appointment"),
  description: z.string().optional().describe("Description of the appointment"),
  startTime: z.string().describe("Start time (ISO string format)"),
  contactId: z.string().optional().describe("Contact ID in GoHighLevel"),
  userTimeZone: z
    .string()
    .optional()
    .describe(
      "User's preferred timezone. If provided, use IANA timezone identifiers."
    ),
});

export const rescheduleAppointmentSchema = z.object({
  eventId: z.string().describe("ID of the appointment to reschedule"),
  startTime: z.string().describe("New start time (ISO string format)"),
  userTimeZone: z
    .string()
    .optional()
    .describe(
      "User's preferred timezone. If provided, use IANA timezone identifiers."
    ),
});

export const cancelAppointmentSchema = z.object({
  eventId: z.string().describe("ID of the appointment to cancel"),
  reason: z.string().optional().describe("Reason for cancellation"),
});

export const listAppointmentsSchema = z.object({
  startDate: z
    .string()
    .optional()
    .describe("Start date for the range (timestamp in ms)"),
  endDate: z
    .string()
    .optional()
    .describe("End date for the range (timestamp in ms)"),
  maxResults: z
    .number()
    .optional()
    .default(10)
    .describe("Maximum number of results to return"),
  userTimeZone: z
    .string()
    .optional()
    .describe(
      "User's preferred timezone. If provided, use IANA timezone identifiers."
    ),
});

// Schema for listing available slots
export const listAvailableSlotsSchema = z.object({
  startDate: z
    .string()
    .optional()
    .describe("Start date for the range (YYYY-MM-DD)"),
  endDate: z
    .string()
    .optional()
    .describe("End date for the range (YYYY-MM-DD)"),
  interval: z
    .number()
    .optional()
    .default(30)
    .describe("Interval between slots in minutes (e.g., 30 min slots)"),
  timezone: z
    .string()
    .optional()
    .describe(
      "User's preferred timezone. Pass empty string if not provided by the user. If provided, use IANA timezone identifiers."
    ),
  userId: z.string().optional().describe("Specific user ID to filter slots by"),
  enableLookBusy: z
    .boolean()
    .optional()
    .default(false)
    .describe("Whether to apply the 'Look Busy' feature"),
});
