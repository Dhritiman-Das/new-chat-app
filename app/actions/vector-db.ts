"use server";

import { createSafeActionClient } from "next-safe-action";
import { z } from "zod";
import { getVectorDb } from "@/lib/vectordb";
import { QueryResult } from "@/lib/vectordb/types";
import type { ActionResponse } from "@/app/actions/types";
import { appErrors } from "@/app/actions/types";

// Create a safe action client
const action = createSafeActionClient();

// Schema for fetching vector record
const fetchVectorRecordSchema = z.object({
  id: z.string(),
});

// Normal function to fetch vector record by ID
async function getVectorRecordById(id: string): Promise<QueryResult | null> {
  try {
    const vectorDb = await getVectorDb();
    const response = await vectorDb.fetchRecordsByIds([id]);

    if (!response.success || !response.data) {
      return null;
    }

    // Safely access the records from the data object
    const data = response.data as { records?: unknown[] };
    const records = data.records;

    if (!records || !Array.isArray(records) || records.length === 0) {
      return null;
    }

    return records[0] as QueryResult;
  } catch (error) {
    console.error("Error fetching vector record:", error);
    return null;
  }
}

/**
 * Fetches a vector record by ID from the vector database
 */
export const fetchVectorRecord = action
  .schema(fetchVectorRecordSchema)
  .action(async (input): Promise<ActionResponse<QueryResult | null>> => {
    try {
      const record = await getVectorRecordById(input.parsedInput.id);

      if (!record) {
        return {
          success: false,
          error: appErrors.NOT_FOUND,
        };
      }

      return {
        success: true,
        data: record,
      };
    } catch (error) {
      console.error("Error in fetchVectorRecord action:", error);
      return {
        success: false,
        error: appErrors.UNEXPECTED_ERROR,
      };
    }
  });
