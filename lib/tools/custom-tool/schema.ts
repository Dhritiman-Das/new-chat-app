import { z } from "zod";

// Schema for custom tool parameters
export const customToolParameterSchema = z.object({
  name: z.string().min(1, "Parameter name is required"),
  type: z.enum(["string", "number", "boolean", "object", "array"]),
  description: z.string().optional(),
  required: z.boolean().default(false),
  enumValues: z.array(z.string()).optional(),
  itemsType: z.enum(["string", "number", "boolean", "object"]).optional(),
});

// Schema for HTTP headers
export const httpHeaderSchema = z.object({
  name: z.string().min(1, "Header name is required"),
  value: z.string().min(1, "Header value is required"),
});

// Main custom tool schema
export const customToolSchema = z.object({
  name: z
    .string()
    .min(1, "Tool name is required")
    .max(100, "Tool name too long")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Tool name should only contain alphanumeric characters, underscores, and hyphens"
    ),
  description: z
    .string()
    .min(1, "Tool description is required")
    .max(500, "Description too long"),
  async: z.boolean().default(false),
  strict: z.boolean().default(false),
  parameters: z.array(customToolParameterSchema).default([]),
  serverUrl: z.string().url("Please enter a valid URL"),
  secretToken: z.string().min(1, "Secret token is required"),
  timeout: z.number().min(1).max(300).default(30),
  httpHeaders: z.array(httpHeaderSchema).default([]),
});

// Schema for the function configuration
export const customToolFunctionSchema = z.object({
  name: z.string().min(1, "Function name is required"),
  description: z.string().min(1, "Function description is required"),
  parameters: z.array(customToolParameterSchema),
});

// Type exports
export type CustomToolParameter = z.infer<typeof customToolParameterSchema>;
export type HttpHeader = z.infer<typeof httpHeaderSchema>;
export type CustomTool = z.infer<typeof customToolSchema>;
export type CustomToolFunction = z.infer<typeof customToolFunctionSchema>;
