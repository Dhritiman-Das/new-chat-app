import { z } from "zod";

// Configuration schema for Google Calendar tool
export const googleCalendarConfigSchema = z.object({
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
});

// Credential schema for Google Calendar
export const googleCalendarCredentialSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  token_type: z.string(),
  expiry_date: z.number(),
  scope: z.string().optional(),
});

// Function parameter schemas
export const bookAppointmentSchema = z.object({
  title: z.string().describe("Title of the appointment"),
  description: z.string().optional().describe("Description of the appointment"),
  startTime: z.string().optional().describe("Start time (ISO string format)"),
});

export const rescheduleAppointmentSchema = z.object({
  appointmentId: z.string().describe("ID of the appointment to reschedule"),
  startTime: z
    .string()
    .optional()
    .describe("New start time (ISO string format)"),
});

export const cancelAppointmentSchema = z.object({
  appointmentId: z.string().describe("ID of the appointment to cancel"),
  reason: z.string().optional().describe("Reason for cancellation"),
});

export const listAppointmentsSchema = z.object({
  startDate: z
    .string()
    .optional()
    .describe("Start date for the range (YYYY-MM-DD)"),
  endDate: z
    .string()
    .optional()
    .describe("End date for the range (YYYY-MM-DD)"),
  maxResults: z
    .number()
    .optional()
    .default(10)
    .describe("Maximum number of results to return"),
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
});
