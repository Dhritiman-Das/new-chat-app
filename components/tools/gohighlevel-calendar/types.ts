import {
  GoHighLevelAppointment as Appointment,
  GoHighLevelCalendar as Calendar,
  GoHighLevelLocation as Location,
  GoHighLevelTimeSlot as TimeSlot,
  GOHIGHLEVEL_DAYS_OF_WEEK as DAYS_OF_WEEK,
} from "@/lib/shared/types/gohighlevel";

// Interface for serialized tool object
export interface SerializableTool {
  id: string;
  name: string;
  description: string;
  type: string;
  integrationType?: string;
  version: string;
  defaultConfig?: Record<string, unknown>;
  functionsMeta: Record<string, { description: string }>;
}

export const timeSlotSchema = {
  day: [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ] as const,
  startTime: "",
  endTime: "",
};

export type { Appointment, Calendar, Location, TimeSlot };

export { DAYS_OF_WEEK };
