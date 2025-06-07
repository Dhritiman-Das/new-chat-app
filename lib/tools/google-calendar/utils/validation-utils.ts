import {
  parseISO,
  getDay,
  format,
  isBefore,
  isAfter,
  addMinutes,
  isValid,
} from "date-fns";
import { toZonedTime } from "date-fns-tz";

// Type for calendar configuration
export interface CalendarConfig {
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

/**
 * Error class for appointment scheduling validation errors
 */
export class AppointmentValidationError extends Error {
  code: string;

  constructor(message: string, code = "VALIDATION_ERROR") {
    super(message);
    this.name = "AppointmentValidationError";
    this.code = code;
  }
}

/**
 * Validates if a proposed appointment time adheres to calendar configuration settings
 *
 * @param startTime - The proposed appointment start time as ISO string
 * @param duration - The duration of the appointment in minutes
 * @param config - The calendar configuration
 * @returns void if valid, throws AppointmentValidationError if invalid
 */
export function validateAppointmentTime(
  startTime: string,
  duration: number,
  config: CalendarConfig
): void {
  const timeZone = config.timeZone || "America/New_York";

  // Map day number to day name
  const dayNames = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];

  // Parse the start time and convert to IST
  const parsedStartTime = toZonedTime(parseISO(startTime), timeZone);

  // Check if valid date
  if (!isValid(parsedStartTime)) {
    throw new AppointmentValidationError(
      "Invalid appointment start time format. Please use ISO 8601 format (e.g., 2023-11-15T10:00:00Z).",
      "INVALID_START_TIME"
    );
  }

  // Check if in the past
  const currentTime = toZonedTime(new Date(), timeZone);
  if (isBefore(parsedStartTime, currentTime)) {
    throw new AppointmentValidationError(
      "Appointment start time cannot be in the past.",
      "START_TIME_IN_PAST"
    );
  }

  // Calculate end time based on duration and buffer time
  const bufferTimeBetweenMeetings = config.bufferTimeBetweenMeetings || 0;
  const appointmentEndTime = addMinutes(parsedStartTime, duration);
  const totalEndTime = addMinutes(
    appointmentEndTime,
    bufferTimeBetweenMeetings
  );

  // Get the day of week from the start time in IST
  const dayOfWeek = getDay(parsedStartTime);
  const dayName = dayNames[dayOfWeek];

  // Get available time slots from config
  const availableTimeSlots = config.availableTimeSlots || [
    { day: "monday", startTime: "09:00", endTime: "17:00" },
    { day: "tuesday", startTime: "09:00", endTime: "17:00" },
    { day: "wednesday", startTime: "09:00", endTime: "17:00" },
    { day: "thursday", startTime: "09:00", endTime: "17:00" },
    { day: "friday", startTime: "09:00", endTime: "17:00" },
  ];

  // Find the available slot for this day
  const daySlot = availableTimeSlots.find(
    (slot) => slot.day.toLowerCase() === dayName
  );

  // If no configuration for this day, it's not available
  if (!daySlot) {
    throw new AppointmentValidationError(
      `Appointments are not available on ${format(
        parsedStartTime,
        "EEEE"
      )}s according to your calendar settings.`,
      "DAY_NOT_AVAILABLE"
    );
  }

  // Parse the start and end time for this day
  const [startHour, startMinute] = daySlot.startTime.split(":").map(Number);
  const [endHour, endMinute] = daySlot.endTime.split(":").map(Number);

  // Create date objects for the configured start/end times on this date in IST
  const configuredStartTime = new Date(parsedStartTime);
  configuredStartTime.setHours(startHour, startMinute, 0, 0);

  const configuredEndTime = new Date(parsedStartTime);
  configuredEndTime.setHours(endHour, endMinute, 0, 0);

  // Check if appointment starts after configured start time
  if (isBefore(parsedStartTime, configuredStartTime)) {
    throw new AppointmentValidationError(
      `Appointment time is outside available hours. Available times on ${format(
        parsedStartTime,
        "EEEE"
      )} are between ${daySlot.startTime} and ${daySlot.endTime} ${timeZone}.`,
      "OUTSIDE_AVAILABLE_HOURS"
    );
  }

  // Check if appointment ends (including buffer) before configured end time
  if (isAfter(totalEndTime, configuredEndTime)) {
    throw new AppointmentValidationError(
      `Appointment would end outside available hours. Available times on ${format(
        parsedStartTime,
        "EEEE"
      )} are between ${daySlot.startTime} and ${daySlot.endTime} ${timeZone}.`,
      "OUTSIDE_AVAILABLE_HOURS"
    );
  }

  // Check availability window with timezone consideration
  const availabilityWindowDays = config.availabilityWindowDays || 14;
  const maxFutureDate = addMinutes(
    currentTime,
    availabilityWindowDays * 24 * 60
  );

  if (isAfter(parsedStartTime, maxFutureDate)) {
    throw new AppointmentValidationError(
      `Appointment is too far in the future. Appointments can only be scheduled up to ${availabilityWindowDays} days in advance.`,
      "OUTSIDE_AVAILABILITY_WINDOW"
    );
  }

  // All validations passed
  return;
}
