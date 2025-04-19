"use server";

import { createSafeActionClient } from "next-safe-action";
import { z } from "zod";
import { ActionResponse, appErrors } from "./types";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/utils/auth";

// Create safe action client
const action = createSafeActionClient();

// Survey schema validation
const surveySchema = z.object({
  referralSource: z.string().optional(),
  primaryUseCase: z.array(z.string()).optional(),
  expectedBots: z.string().optional(),
  integrations: z.array(z.string()).optional(),
});

// Submit survey action
export const submitSurvey = action
  .schema(surveySchema)
  .action(async ({ parsedInput }): Promise<ActionResponse> => {
    try {
      const user = await requireAuth();

      // Check if a survey already exists for this user
      const existingSurvey = await prisma.survey.findUnique({
        where: {
          userId: user.id,
        },
      });

      if (existingSurvey) {
        // Update existing survey
        const updatedSurvey = await prisma.survey.update({
          where: {
            userId: user.id,
          },
          data: {
            referralSource: parsedInput.referralSource,
            primaryUseCase: parsedInput.primaryUseCase || [],
            expectedBots: parsedInput.expectedBots,
            integrations: parsedInput.integrations || [],
            updatedAt: new Date(),
          },
        });

        return {
          success: true,
          data: updatedSurvey,
        };
      } else {
        // Create new survey
        const newSurvey = await prisma.survey.create({
          data: {
            userId: user.id,
            referralSource: parsedInput.referralSource,
            primaryUseCase: parsedInput.primaryUseCase || [],
            expectedBots: parsedInput.expectedBots,
            integrations: parsedInput.integrations || [],
          },
        });

        return {
          success: true,
          data: newSurvey,
        };
      }
    } catch (error) {
      console.error("Error submitting survey:", error);
      return {
        success: false,
        error: appErrors.UNEXPECTED_ERROR,
      };
    }
  });

// Get user survey action
export async function getUserSurvey(): Promise<ActionResponse> {
  try {
    const user = await requireAuth();

    const survey = await prisma.survey.findUnique({
      where: {
        userId: user.id,
      },
    });

    return {
      success: true,
      data: survey,
    };
  } catch (error) {
    console.error("Error fetching user survey:", error);
    return {
      success: false,
      error: appErrors.UNEXPECTED_ERROR,
    };
  }
}
