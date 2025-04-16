import { ToolFunction } from "../definitions/tool-interface";
import {
  bookAppointmentSchema,
  rescheduleAppointmentSchema,
  cancelAppointmentSchema,
  listAppointmentsSchema,
} from "./schema";

export const bookAppointment: ToolFunction = {
  description: "Book a new appointment on Google Calendar",
  parameters: bookAppointmentSchema,
  execute: async (params, context) => {
    try {
      // Get config from context
      const config = context.config || {};
      const { appointmentDuration = 30 } = config;
      console.log("appointmentDuration", appointmentDuration);
      // In a real implementation, you would:
      // 1. Initialize the Google Calendar API client with the credentials
      // 2. Create a new event with the provided parameters

      // For now, return a dummy successful response
      return {
        success: true,
        appointmentId: "appt_" + Math.random().toString(36).substring(2, 10),
        message: `Successfully booked appointment: ${params.title}`,
      };
    } catch (error) {
      console.error("Error booking appointment:", error);
      return {
        success: false,
        error: {
          code: "BOOKING_FAILED",
          message: "Failed to book appointment",
        },
      };
    }
  },
};

export const rescheduleAppointment: ToolFunction = {
  description: "Reschedule an existing appointment on Google Calendar",
  parameters: rescheduleAppointmentSchema,
  execute: async (params, context) => {
    try {
      console.log("params", params);
      console.log("context", context);
      // For now, return a dummy successful response
      return {
        success: true,
        appointmentId: params.appointmentId,
        message: `Successfully rescheduled appointment: ${params.appointmentId}`,
      };
    } catch (error) {
      console.error("Error rescheduling appointment:", error);
      return {
        success: false,
        error: {
          code: "RESCHEDULE_FAILED",
          message: "Failed to reschedule appointment",
        },
      };
    }
  },
};

export const cancelAppointment: ToolFunction = {
  description: "Cancel an existing appointment on Google Calendar",
  parameters: cancelAppointmentSchema,
  execute: async (params, context) => {
    try {
      console.log("params", params);
      console.log("context", context);
      // For now, return a dummy successful response
      return {
        success: true,
        appointmentId: params.appointmentId,
        message: `Successfully cancelled appointment: ${params.appointmentId}`,
      };
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      return {
        success: false,
        error: {
          code: "CANCELLATION_FAILED",
          message: "Failed to cancel appointment",
        },
      };
    }
  },
};

export const listAppointments: ToolFunction = {
  description: "List upcoming appointments on Google Calendar",
  parameters: listAppointmentsSchema,
  execute: async (params, context) => {
    try {
      console.log("params", params);
      console.log("context", context);
      // For now, return dummy appointments
      const appointments = [
        {
          id: "appt_123456",
          title: "Team Meeting",
          date: "2023-11-15",
          time: "10:00",
          duration: 60,
        },
        {
          id: "appt_789012",
          title: "Client Call",
          date: "2023-11-16",
          time: "14:30",
          duration: 45,
        },
        {
          id: "appt_345678",
          title: "Product Demo",
          date: "2023-11-17",
          time: "11:00",
          duration: 90,
        },
      ];

      return {
        success: true,
        appointments,
      };
    } catch (error) {
      console.error("Error listing appointments:", error);
      return {
        success: false,
        error: {
          code: "LIST_FAILED",
          message: "Failed to list appointments",
        },
      };
    }
  },
};
