import { z } from "zod";

// Configuration schema for Lead Capture tool
export const leadCaptureConfigSchema = z.object({
  requiredFields: z
    .array(z.enum(["name", "email", "phone", "company"]))
    .default(["name", "phone"])
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
    .default(["pricing", "demo", "contact", "quote", "trial"])
    .describe("Keywords that trigger lead capture"),
  customTriggerPhrases: z
    .array(z.string())
    .optional()
    .default([])
    .describe("Additional custom phrases that trigger lead capture"),
});

// No credentials needed for this tool
export const leadCaptureCredentialSchema = z.object({});

// Function parameter schemas
export const saveLeadSchema = z.object({
  name: z.string().min(1).optional().describe("Full name of the lead"),
  phone: z.string().min(1).optional().describe("Phone number of the lead"),
  email: z
    .string()
    .email()
    .optional()
    .describe("Email address of the lead (optional)"),
  company: z.string().optional().describe("Company name of the lead"),
  source: z
    .string()
    .optional()
    .describe("Source of the lead (e.g., 'chat', 'website')"),
  triggerKeyword: z
    .string()
    .optional()
    .describe("Keyword that triggered the lead capture"),
});

export const requestLeadInfoSchema = z.object({
  fields: z.array(z.string()).describe("Fields to request from the lead"),
  message: z
    .string()
    .optional()
    .describe("Custom message to display when requesting information"),
  triggerKeyword: z
    .string()
    .optional()
    .describe("Keyword that triggered the lead capture"),
});

// Schema for the keyword detection function
export const detectTriggerKeywordSchema = z.object({
  message: z.string().describe("User message to check for trigger keywords"),
});
