import {
  parseISO,
  format,
  addMinutes,
  formatISO,
  parse,
  startOfDay,
  endOfDay,
  addDays,
  isValid,
} from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

/**
 * Formats a date string into a specific format
 */
export function formatDate(
  dateStr: string,
  formatStr: string = "yyyy-MM-dd"
): string {
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) {
      throw new Error("Invalid date");
    }
    return format(date, formatStr);
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateStr; // Return original if parsing fails
  }
}

/**
 * Formats a time string into a specific format
 */
export function formatTime(
  timeStr: string,
  formatStr: string = "HH:mm"
): string {
  try {
    const date = parseISO(timeStr);
    if (!isValid(date)) {
      throw new Error("Invalid time");
    }
    return format(date, formatStr);
  } catch (error) {
    console.error("Error formatting time:", error);
    return timeStr; // Return original if parsing fails
  }
}

/**
 * Combines date and time strings into a full ISO date string
 */
export function combineDateAndTime(dateStr: string, timeStr: string): string {
  try {
    // Parse date as ISO
    const dateObj = parseISO(dateStr);
    if (!isValid(dateObj)) {
      throw new Error("Invalid date");
    }

    // Parse time (assuming format like "14:30")
    let hours = 0;
    let minutes = 0;

    if (timeStr.includes(":")) {
      const [hoursStr, minutesStr] = timeStr.split(":");
      hours = parseInt(hoursStr, 10);
      minutes = parseInt(minutesStr, 10);
    } else {
      throw new Error("Invalid time format, expected HH:MM");
    }

    // Set hours and minutes on the date object
    const dateWithTime = new Date(dateObj);
    dateWithTime.setHours(hours, minutes, 0, 0);

    return formatISO(dateWithTime);
  } catch (error) {
    console.error("Error combining date and time:", error);
    return new Date().toISOString(); // Return current date/time as fallback
  }
}

/**
 * Calculate the end time for an event given a start time and duration
 */
export function calculateEndTime(
  startTimeStr: string,
  durationMinutes: number
): string {
  try {
    const startTime = parseISO(startTimeStr);
    if (!isValid(startTime)) {
      throw new Error("Invalid start time");
    }

    const endTime = addMinutes(startTime, durationMinutes);
    return formatISO(endTime);
  } catch (error) {
    console.error("Error calculating end time:", error);
    // Fallback to adding duration to current time
    return formatISO(addMinutes(new Date(), durationMinutes));
  }
}

/**
 * Parse a date string in format YYYY-MM-DD
 */
export function parseDate(dateStr: string): Date {
  if (!dateStr) {
    return new Date();
  }

  try {
    // Try parsing as ISO
    const date = parseISO(dateStr);
    if (isValid(date)) {
      return date;
    }

    // Try parsing as YYYY-MM-DD
    return parse(dateStr, "yyyy-MM-dd", new Date());
  } catch (error) {
    console.error("Error parsing date:", error);
    return new Date(); // Return current date as fallback
  }
}

/**
 * Get start and end timestamps for a date range
 */
export function getDateRange(
  startDateStr?: string,
  endDateStr?: string,
  defaultDays: number = 7
): { start: string; end: string } {
  try {
    let start: Date;
    let end: Date;

    if (startDateStr) {
      start = startOfDay(parseDate(startDateStr));
    } else {
      start = startOfDay(new Date());
    }

    if (endDateStr) {
      end = endOfDay(parseDate(endDateStr));
    } else {
      end = endOfDay(addDays(start, defaultDays));
    }

    return {
      start: formatISO(start),
      end: formatISO(end),
    };
  } catch (error) {
    console.error("Error calculating date range:", error);
    const now = new Date();
    return {
      start: formatISO(startOfDay(now)),
      end: formatISO(endOfDay(addDays(now, defaultDays))),
    };
  }
}

/**
 * Get start and end timestamps for a date range in a specific timezone
 */
export function getDateTimeRangeInUserTimeZone({
  startDate,
  endDate,
  userTimeZone,
  availabilityWindowDays,
}: {
  startDate?: string;
  endDate?: string;
  userTimeZone: string;
  availabilityWindowDays: number;
}): { start: string; end: string } {
  if (!startDate) {
    startDate = new Date().toISOString();
  }
  if (!endDate) {
    // Add availability window days to end date
    endDate = addDays(new Date(), availabilityWindowDays).toISOString();
  }
  // Start at 00:00:00 in user timezone
  const start = formatInTimeZone(
    startDate,
    userTimeZone,
    "yyyy-MM-dd'T'00:00:00XXX"
  );
  // End at 23:59:59 in user timezone
  const end = formatInTimeZone(
    endDate,
    userTimeZone,
    "yyyy-MM-dd'T'23:59:59XXX"
  );
  return { start, end };
}
