import { z } from "zod";

// Configuration schema for Lead Capture tool
export const leadCaptureConfigSchema = z.object({
  requiredFields: z
    .array(z.enum(["name", "email", "phone", "company", "message"]))
    .default(["name", "email"])
    .describe("Fields that must be collected"),
  leadNotifications: z
    .boolean()
    .default(true)
    .describe("Send notifications when new leads are captured"),
  notificationEmail: z
    .string()
    .email()
    .optional()
    .describe("Email address to send lead notifications to"),
  leadCaptureTriggers: z
    .array(z.string())
    .optional()
    .describe("Keywords that trigger lead capture"),
});

// No credentials needed for this tool
export const leadCaptureCredentialSchema = z.object({});

// Function parameter schemas
export const saveLeadSchema = z.object({
  name: z.string().describe("Full name of the lead"),
  email: z.string().email().describe("Email address of the lead"),
  phone: z.string().optional().describe("Phone number of the lead"),
  company: z.string().optional().describe("Company name of the lead"),
  notes: z.string().optional().describe("Additional notes about the lead"),
});

export const requestLeadInfoSchema = z.object({
  fields: z
    .array(z.enum(["name", "email", "phone", "company", "message"]))
    .describe("Fields to request from the lead"),
  message: z
    .string()
    .optional()
    .describe("Custom message to display when requesting information"),
});
