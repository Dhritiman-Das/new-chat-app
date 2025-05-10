import { ToolDefinition } from "../definitions/tool-interface";
import {
  gohighlevelCalendarConfigSchema,
  gohighlevelCalendarCredentialSchema,
} from "./schema";
import {
  bookAppointment,
  cancelAppointment,
  listAppointments,
  listAvailableSlots,
  rescheduleAppointment,
} from "./functions";
import GoHighLevelLogo from "./assets/logo";
import GoHighLevelScopeDialog from "./components/scope-details-dialog";

export const gohighlevelCalendarTool: ToolDefinition = {
  id: "gohighlevel-calendar",
  name: "GoHighLevel Calendar",
  description: "Book, cancel, and list appointments on GoHighLevel Calendar",
  type: "CALENDAR_BOOKING",
  integrationType: "gohighlevel",
  version: "1.0.0",
  icon: <GoHighLevelLogo className="w-8 h-8" />,
  configSchema: gohighlevelCalendarConfigSchema,
  functions: {
    bookAppointment,
    cancelAppointment,
    listAppointments,
    listAvailableSlots,
    rescheduleAppointment,
  },
  getCredentialSchema: () => gohighlevelCalendarCredentialSchema,
  defaultConfig: {
    appointmentDuration: 30,
    availabilityWindowDays: 14,
    timeZone: "America/New_York",
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
    provider: "gohighlevel",
    scopes: [],
    authAction: "connectGoHighLevel",
    disconnectAction: "disconnectGoHighLevel",
  },
  moreDetailsDialog: <GoHighLevelScopeDialog />,
};
