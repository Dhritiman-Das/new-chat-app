// Interface for Appointment data
export interface Appointment {
  id: string;
  botId: string;
  conversationId?: string | null;
  calendarId?: string | null;
  externalEventId?: string | null;
  calendarProvider: string;
  title?: string | null;
  description?: string | null;
  location?: string | null;
  status?: string | null;
  startTime: string;
  endTime: string;
  timeZone?: string | null;
  organizer?: Record<string, unknown> | null;
  attendees?: Array<{
    email: string;
    name?: string;
    response?: string;
    [key: string]: string | undefined;
  }> | null;
  recurringPattern?: string | null;
  meetingLink?: string | null;
  source?: string | null;
  properties?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

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
  beta?: boolean;
}

export interface Calendar {
  id: string;
  name: string;
  isPrimary?: boolean;
  description?: string;
  backgroundColor?: string;
  foregroundColor?: string;
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

export type TimeSlot = {
  day: (typeof timeSlotSchema.day)[number];
  startTime: string;
  endTime: string;
};

export const DAYS_OF_WEEK = [
  { id: "monday", label: "Monday" },
  { id: "tuesday", label: "Tuesday" },
  { id: "wednesday", label: "Wednesday" },
  { id: "thursday", label: "Thursday" },
  { id: "friday", label: "Friday" },
  { id: "saturday", label: "Saturday" },
  { id: "sunday", label: "Sunday" },
] as const;
