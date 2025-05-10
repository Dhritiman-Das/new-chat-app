/**
 * GoHighLevel Calendar Client
 * Provides methods to interact with the GoHighLevel calendar API.
 * API Endpoint: https://services.leadconnectorhq.com/calendars/
 */

import { Calendar } from "@/components/tools/gohighlevel-calendar/types";
import { ProviderError } from "../../errors";
import { GoHighLevelClient } from "./index";

/**
 * Represents a calendar event/appointment in the GoHighLevel system
 * @see https://services.leadconnectorhq.com/calendars/events/appointments
 */
export interface CalendarEvent {
  id: string; // Unique identifier for the event
  title: string; // Title/name of the event
  address?: string; // Physical address for the event (if applicable)
  calendarId: string; // ID of the calendar this event belongs to
  locationId: string; // ID of the location this event is associated with
  contactId?: string; // ID of the contact associated with this event
  groupId?: string; // ID of the group this event belongs to
  appointmentStatus: string; // Status of the appointment (new, confirmed, cancelled, showed, noshow, invalid)
  assignedUserId?: string; // ID of the user assigned to this event (primary owner)
  users?: string[]; // IDs of users associated with this event (secondary owners)
  notes?: string; // Additional notes for the event
  isRecurring?: boolean; // Whether this event is part of a recurring series
  rrule?: string; // Recurrence rule in iCalendar format (RFC 5545)
  startTime: string | Date; // Start time of the event
  endTime: string | Date; // End time of the event
  dateAdded?: string | Date; // When this event was created
  dateUpdated?: string | Date; // When this event was last updated
  assignedResources?: string[]; // IDs of resources assigned to this event
  createdBy?: Record<string, unknown>; // Information about who created this event
  masterEventId?: string; // For recurring events, ID of the master/parent event
  meetingLocationType?:
    | "custom"
    | "zoom"
    | "gmeet"
    | "phone"
    | "address"
    | "ms_teams"
    | "google"; // Type of meeting location
  meetingLocationId?: string; // ID of the meeting location configuration
}

/**
 * Response format for the available slots endpoint.
 * Contains dates as keys with arrays of available time slots.
 */
export interface AvailableSlotsResponse {
  [key: string]: { slots: string[] } | string | undefined;
}

/**
 * Client for interacting with GoHighLevel Calendar API
 * @see https://services.leadconnectorhq.com/calendars/
 */
export class CalendarClient {
  private parent: GoHighLevelClient;
  private locationId?: string;

  /**
   * Create a new CalendarClient instance
   *
   * @param parent - Parent GoHighLevelClient instance
   * @param locationId - Optional location ID to scope operations to
   */
  constructor(parent: GoHighLevelClient, locationId?: string) {
    this.parent = parent;
    this.locationId = locationId;
  }

  /**
   * Get all calendars for a location
   * Endpoint: GET /calendars/
   *
   * @returns Promise resolving to an array of Calendar objects
   * @throws ProviderError if the request fails
   *
   * @example Response format:
   * ```
   * {
   *   "calendars": [
   *     {
   *       "id": "0TkCdp9PfvLeWKYRRvIz",
   *       "name": "test calendar",
   *       "isActive": true,
   *       "description": "this is used for testing",
   *       "locationId": "ocQHyuzHvysMo5N5VsXc",
   *       "groupId": "BqTwX8QFwXzpegMve9EQ",
   *       "calendarType": "personal",
   *       "eventColor": "#039be5",
   *       "isPrimary": false,
   *       "slug": "test1",
   *       "widgetSlug": "test1",
   *       "slotDuration": 30,
   *       "slotDurationUnit": "mins"
   *     },
   *     ...
   *   ]
   * }
   * ```
   */
  async getCalendars(): Promise<Calendar[]> {
    try {
      const client = await this.parent.getClient();

      // Build query parameters
      const params = new URLSearchParams();

      if (this.locationId) {
        params.append("locationId", this.locationId);
      }

      // Fetch calendars for the specified location
      const response = await client.get(`/calendars/?${params.toString()}`);

      if (response.data && response.data.calendars) {
        // Map the calendars to our interface
        return response.data.calendars.map(
          (cal: {
            id: string;
            name: string;
            isActive?: boolean;
            description?: string;
            locationId?: string;
            groupId?: string;
            calendarType?: string;
            eventColor?: string;
            isPrimary?: boolean;
            slug?: string;
            widgetSlug?: string;
            slotDuration?: number;
            slotDurationUnit?: string;
          }) => ({
            id: cal.id,
            name: cal.name,
            isActive: cal.isActive || false,
            description: cal.description || undefined,
            locationId: cal.locationId || undefined,
            groupId: cal.groupId || undefined,
            calendarType: cal.calendarType || undefined,
            eventColor: cal.eventColor || undefined,
            isPrimary: cal.isPrimary || false,
            slug: cal.slug || undefined,
            widgetSlug: cal.widgetSlug || undefined,
            slotDuration: cal.slotDuration || undefined,
            slotDurationUnit: cal.slotDurationUnit || undefined,
          })
        );
      }
      return [];
    } catch (error) {
      console.error("Error fetching GoHighLevel calendars:", error);
      throw new ProviderError(
        `Failed to fetch GoHighLevel calendars: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "gohighlevel",
        "CALENDAR_FETCH_ERROR"
      );
    }
  }

  /**
   * Get calendar events for a specific time range
   * Endpoint: GET /calendars/events
   *
   * @param startTime - Start time (timestamp or string)
   * @param endTime - End time (timestamp or string)
   * @param options - Optional filters (calendarId, groupId, userId)
   * @returns Promise resolving to an array of CalendarEvent objects
   * @throws ProviderError if the request fails or locationId is missing
   *
   * @remarks
   * At least one of calendarId, groupId, or userId must be provided in the options.
   *
   * @example Response format:
   * ```
   * {
   *   "events": [
   *     {
   *       "id": "ocQHyuzHvysMo5N5VsXc",
   *       "title": "Appointment with GHL Dev team",
   *       "calendarId": "BqTwX8QFwXzpegMve9EQ",
   *       "locationId": "0007BWpSzSwfiuSl0tR2",
   *       "contactId": "9NkT25Vor1v4aQatFsv2",
   *       "groupId": "9NkT25Vor1v4aQatFsv2",
   *       "appointmentStatus": "confirmed",
   *       "assignedUserId": "YlWd2wuCAZQzh2cH1fVZ",
   *       "users": ["YlWd2wuCAZQzh2cH1fVZ", "9NkT25Vor1v4aQatFsv2"],
   *       "startTime": "2023-09-25T16:00:00+05:30",
   *       "endTime": "2023-09-25T16:30:00+05:30",
   *       "dateAdded": "2023-09-24T10:00:00+05:30",
   *       "dateUpdated": "2023-09-24T10:00:00+05:30"
   *     },
   *     ...
   *   ]
   * }
   * ```
   */
  async getCalendarEvents(
    startTime: number | string,
    endTime: number | string,
    options?: {
      calendarId?: string;
      groupId?: string;
      userId?: string;
    }
  ): Promise<CalendarEvent[]> {
    try {
      const client = await this.parent.getClient();

      if (!this.locationId) {
        throw new ProviderError(
          "Location ID is required to fetch calendar events",
          "gohighlevel",
          "MISSING_LOCATION_ID"
        );
      }

      // Build query parameters
      const params = new URLSearchParams();
      params.append("locationId", this.locationId);
      params.append("startTime", startTime.toString());
      params.append("endTime", endTime.toString());

      // Add optional filtering parameters
      if (options?.calendarId) {
        params.append("calendarId", options.calendarId);
      }

      if (options?.groupId) {
        params.append("groupId", options.groupId);
      }

      if (options?.userId) {
        params.append("userId", options.userId);
      }

      // Make the API request
      const response = await client.get(
        `/calendars/events?${params.toString()}`
      );

      if (response.data && Array.isArray(response.data.events)) {
        return response.data.events;
      }

      return [];
    } catch (error) {
      console.error("Error fetching GoHighLevel calendar events:", error);
      throw new ProviderError(
        `Failed to fetch calendar events: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "gohighlevel",
        "EVENTS_FETCH_ERROR"
      );
    }
  }

  /**
   * Get available calendar slots
   * Endpoint: GET /calendars/{calendarId}/free-slots
   *
   * @param calendarId - ID of the calendar to check
   * @param startDate - Start date as a timestamp
   * @param endDate - End date as a timestamp
   * @param options - Optional parameters for filtering available slots
   * @returns Promise resolving to an AvailableSlotsResponse containing dates as keys with arrays of time slots
   *
   * @example Response format:
   * ```
   * {
   *   "2025-07-14": {
   *     "slots": [
   *       "2025-07-14T13:00:00+01:00",
   *       "2025-07-14T13:30:00+01:00",
   *       ...
   *     ]
   *   },
   *   "2025-07-15": {
   *     "slots": [
   *       "2025-07-15T13:00:00+01:00",
   *       ...
   *     ]
   *   },
   *   "traceId": "e0197aa0-4feb-4939-82e3-b4047a944415"
   * }
   * ```
   *
   * @throws ProviderError if the request fails
   */
  async getAvailableSlots(
    calendarId: string,
    startDate: number,
    endDate: number,
    options?: {
      enableLookBusy?: boolean; // Whether to respect the "look busy" settings for the calendar
      timezone?: string; // Timezone for the returned slots (e.g., "America/New_York")
      userId?: string; // Filter slots for a specific user
      userIds?: string[]; // Filter slots for multiple users
    }
  ): Promise<AvailableSlotsResponse> {
    try {
      const client = await this.parent.getClient();

      // Build query parameters
      const params = new URLSearchParams();
      params.append("startDate", startDate.toString());
      params.append("endDate", endDate.toString());

      // Add optional parameters if provided
      if (options?.enableLookBusy !== undefined) {
        params.append("enableLookBusy", options.enableLookBusy.toString());
      }

      if (options?.timezone) {
        params.append("timezone", options.timezone);
      }

      if (options?.userId) {
        params.append("userId", options.userId);
      }

      if (options?.userIds?.length) {
        // If we need to pass an array, we could use JSON.stringify or join
        // For now just taking the first element as the API example isn't clear
        params.append("userIds", JSON.stringify(options.userIds));
      }

      const response = await client.get(
        `/calendars/${calendarId}/free-slots?${params.toString()}`
      );

      // Handle different response formats - could be an object with dates as keys
      // Example: {"2025-05-12": {"slots": ["2025-05-12T13:00:00+01:00", ...]}, ...}
      if (response.data) {
        if (typeof response.data === "object") {
          // Filter out non-date keys (like traceId)
          const dateKeys = Object.keys(response.data).filter(
            (key) =>
              key !== "traceId" &&
              response.data[key] &&
              response.data[key].slots
          );

          if (dateKeys.length > 0) {
            // Return the complete response object with date keys
            return response.data as AvailableSlotsResponse;
          }
        }

        // Fall back to the previous approach if new format isn't detected
        if (response.data._dates_ && response.data._dates_.slots) {
          return {
            _dates_: response.data._dates_,
          } as unknown as AvailableSlotsResponse;
        }
      }

      return {} as AvailableSlotsResponse;
    } catch (error) {
      console.error("Error fetching GoHighLevel calendar slots:", error);
      throw new ProviderError(
        `Failed to fetch calendar slots: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "gohighlevel",
        "SLOTS_FETCH_ERROR"
      );
    }
  }

  /**
   * Create a calendar appointment
   * Endpoint: POST /calendars/events/appointments
   *
   * @param appointment - Appointment details
   * @returns Promise resolving to the created appointment data, typically containing the created event and any success metadata
   * @throws ProviderError if the request fails
   *
   * @example Request body:
   * ```
   * {
   *   "calendarId": "CVokAlI8fgw4WYWoCtQz",
   *   "locationId": "C2QujeCh8ZnC7al2InWR",
   *   "contactId": "0007BWpSzSwfiuSl0tR2",
   *   "startTime": "2021-06-23T03:30:00+05:30",
   *   "endTime": "2021-06-23T04:30:00+05:30",
   *   "title": "Test Event",
   *   "appointmentStatus": "confirmed",
   *   "meetingLocationType": "custom",
   *   "address": "123 Main St"
   * }
   * ```
   */
  async createAppointment(appointment: {
    calendarId: string; // Required: ID of the calendar to create the appointment in
    startTime: string; // Required: Start time for the appointment (ISO format recommended)
    endTime: string; // Required: End time for the appointment (ISO format recommended)
    title: string; // Required: Title for the appointment
    description?: string; // Optional: Detailed description of the appointment
    contactId?: string; // Optional: ID of the contact associated with this appointment
    firstName?: string; // Optional: First name of the attendee (if not using contactId)
    lastName?: string; // Optional: Last name of the attendee (if not using contactId)
    email?: string; // Optional: Email of the attendee (if not using contactId)
    phone?: string; // Optional: Phone number of the attendee (if not using contactId)
    appointmentStatus?:
      | "new"
      | "confirmed"
      | "cancelled"
      | "showed"
      | "noshow"
      | "invalid"; // Status of the appointment
    meetingLocationType?:
      | "custom"
      | "zoom"
      | "gmeet"
      | "phone"
      | "address"
      | "ms_teams"
      | "google"; // Type of meeting location
    meetingLocationId?: string; // ID of the meeting location configuration
    address?: string; // Physical address (when meetingLocationType is 'address' or 'custom')
    assignedUserId?: string; // User assigned to this appointment
    ignoreDateRange?: boolean; // If true, minimum scheduling notice and date range are ignored
    toNotify?: boolean; // If false, automations won't run for this appointment
    ignoreFreeSlotValidation?: boolean; // If true, time slot validation is bypassed
    rrule?: string; // Recurrence rule for creating recurring appointments
    [key: string]: unknown; // Other properties as needed
  }): Promise<{
    appointment?: CalendarEvent;
    success?: boolean;
    message?: string;
    id?: string; // The created appointment ID
    calendarId?: string; // Calendar ID
    locationId?: string; // Location ID
    contactId?: string; // Contact ID
    startTime?: string; // Start time of appointment
    endTime?: string; // End time of appointment
    title?: string; // Title of the appointment
    [key: string]: unknown;
  }> {
    try {
      const client = await this.parent.getClient();

      // Ensure we have a locationId for the appointment
      const payload = {
        ...appointment,
        locationId: this.locationId,
      };

      const response = await client.post(
        `/calendars/events/appointments`,
        payload
      );

      return response.data;
    } catch (error) {
      console.error("Error creating GoHighLevel appointment:", error);
      throw new ProviderError(
        `Failed to create appointment: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "gohighlevel",
        "APPOINTMENT_CREATE_ERROR"
      );
    }
  }

  /**
   * Get a specific appointment by ID
   * Endpoint: GET /calendars/events/appointments/{eventId}
   *
   * @param eventId - ID of the event to retrieve (can be master event ID or instance ID for recurring events)
   * @returns Promise resolving to the CalendarEvent or null if not found
   * @throws ProviderError if the request fails
   *
   * @example
   * ```typescript
   * // Get a single appointment
   * const appointment = await calendarClient.getAppointment("ocQHyuzHvysMo5N5VsXc");
   *
   * // Get a specific instance of a recurring appointment
   * const recurringInstance = await calendarClient.getAppointment("ocQHyuzHvysMo5N5VsXc_1729821600000_1800");
   * ```
   */
  async getAppointment(eventId: string): Promise<CalendarEvent | null> {
    try {
      const client = await this.parent.getClient();

      const response = await client.get(
        `/calendars/events/appointments/${eventId}`
      );

      if (response.data && response.data.appointment) {
        return response.data.appointment;
      }

      return null;
    } catch (error) {
      console.error("Error fetching GoHighLevel appointment:", error);
      throw new ProviderError(
        `Failed to fetch appointment: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "gohighlevel",
        "APPOINTMENT_FETCH_ERROR"
      );
    }
  }

  /**
   * Update a calendar appointment
   * Endpoint: PUT /calendars/events/appointments/{eventId}
   *
   * @param eventId - ID of the event to update (can be master event ID or instance ID for recurring events)
   * @param updates - Object containing fields to update
   * @returns Promise resolving to the updated appointment data, typically containing the updated event and success metadata
   * @throws ProviderError if the request fails
   *
   * @example
   * ```typescript
   * // Update an appointment status
   * await calendarClient.updateAppointment("ocQHyuzHvysMo5N5VsXc", {
   *   appointmentStatus: "confirmed",
   *   toNotify: true
   * });
   *
   * // Update a specific instance of a recurring appointment
   * await calendarClient.updateAppointment("ocQHyuzHvysMo5N5VsXc_1729821600000_1800", {
   *   startTime: "2021-07-25T15:00:00+01:00",
   *   endTime: "2021-07-25T15:30:00+01:00"
   * });
   * ```
   */
  async updateAppointment(
    eventId: string,
    updates: {
      title?: string; // Title of the appointment
      startTime?: string; // Start time (ISO format recommended)
      endTime?: string; // End time (ISO format recommended)
      appointmentStatus?:
        | "new" // New appointment
        | "confirmed" // Confirmed by attendee/host
        | "cancelled" // Cancelled appointment
        | "showed" // Attendee showed up
        | "noshow" // Attendee did not show up
        | "invalid"; // Invalid appointment
      meetingLocationType?:
        | "custom" // Custom location
        | "zoom" // Zoom meeting
        | "gmeet" // Google Meet
        | "phone" // Phone call
        | "address" // Physical address
        | "ms_teams" // Microsoft Teams
        | "google"; // Google Calendar
      meetingLocationId?: string; // ID of the meeting location (if applicable)
      overrideLocationConfig?: boolean; // Whether to override default location settings
      address?: string; // Physical address (if applicable)
      assignedUserId?: string; // ID of user assigned to this appointment
      ignoreDateRange?: boolean; // Whether to ignore date range validation
      toNotify?: boolean; // Whether to send notifications about this update
      ignoreFreeSlotValidation?: boolean; // Whether to ignore free slot validation
      rrule?: string; // Recurrence rule (if recurring)
      calendarId?: string; // Calendar ID (if changing calendars)
      [key: string]: unknown; // Other fields that may be updated
    }
  ): Promise<{
    appointment?: CalendarEvent;
    success?: boolean;
    message?: string;
    id?: string; // The appointment ID
    calendarId?: string; // Calendar ID
    locationId?: string; // Location ID
    contactId?: string; // Contact ID
    startTime?: string; // Updated start time
    endTime?: string; // Updated end time
    title?: string; // Updated title
    [key: string]: unknown;
  }> {
    try {
      const client = await this.parent.getClient();

      // Ensure we have a locationId for the appointment update if not provided
      const payload = {
        ...updates,
        locationId: updates.locationId || this.locationId,
      };

      const response = await client.put(
        `/calendars/events/appointments/${eventId}`,
        payload
      );

      return response.data;
    } catch (error) {
      console.error("Error updating GoHighLevel appointment:", error);
      throw new ProviderError(
        `Failed to update appointment: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "gohighlevel",
        "APPOINTMENT_UPDATE_ERROR"
      );
    }
  }
}
