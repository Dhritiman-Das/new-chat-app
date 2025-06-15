import { z } from "zod";

// Define search params validation schema for conversations
export const searchParamsCache = z.object({
  page: z.coerce.number().default(1),
  per_page: z.coerce.number().default(10),
  sort: z.string().optional(),
  filters: z.string().optional(),
  search: z.string().optional(),
});

// Validation schema for conversation filters
export const conversationFilterSchema = z.object({
  status: z
    .array(z.enum(["ACTIVE", "COMPLETED", "FAILED", "ABANDONED"]))
    .optional(),
  source: z.array(z.string()).optional(),
  startedAt: z
    .object({
      from: z.coerce.date().optional(),
      to: z.coerce.date().optional(),
    })
    .optional(),
});

// Types for the validation schemas
export type SearchParamsCache = z.infer<typeof searchParamsCache>;
export type ConversationFilterSchema = z.infer<typeof conversationFilterSchema>;
