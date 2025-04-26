import { ToolDefinition } from "../definitions/tool-interface";
import {
  googleCalendarConfigSchema,
  googleCalendarCredentialSchema,
} from "./schema";
import {
  bookAppointment,
  rescheduleAppointment,
  cancelAppointment,
  listAppointments,
  listAvailableSlots,
} from "./functions";
import GoogleCalendarLogo from "./assets/logo";
import GoogleCalendarScopeDialog from "./components/scope-details-dialog";

export const googleCalendarTool: ToolDefinition = {
  id: "google-calendar",
  name: "Google Calendar",
  description:
    "Book, reschedule, cancel, and list appointments on Google Calendar",
  type: "CALENDAR_BOOKING",
  integrationType: "google",
  version: "1.0.0",
  icon: <GoogleCalendarLogo className="w-8 h-8" />,
  configSchema: googleCalendarConfigSchema,
  functions: {
    bookAppointment,
    rescheduleAppointment,
    cancelAppointment,
    listAppointments,
    listAvailableSlots,
  },
  getCredentialSchema: () => googleCalendarCredentialSchema,
  defaultConfig: {
    appointmentDuration: 30,
    availabilityWindowDays: 14,
    availableTimeSlots: [
      { day: "monday", startTime: "09:00", endTime: "17:00" },
      { day: "tuesday", startTime: "09:00", endTime: "17:00" },
      { day: "wednesday", startTime: "09:00", endTime: "17:00" },
      { day: "thursday", startTime: "09:00", endTime: "17:00" },
      { day: "friday", startTime: "09:00", endTime: "17:00" },
    ],
  },
  auth: {
    required: true,
    provider: "google",
    scopes: [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/calendar.readonly",
    ],
    authAction: "connectGoogleCalendar",
    disconnectAction: "disconnectGoogleCalendar",
  },
  moreDetailsDialog: <GoogleCalendarScopeDialog />,
};
