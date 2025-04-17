"use server";

import { createSafeActionClient } from "next-safe-action";
import { z } from "zod";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";

const actionClient = createSafeActionClient();

// Schema for connect Google Calendar input
const connectGoogleCalendarSchema = z.object({
  toolId: z.string(),
  botId: z.string(),
  orgId: z.string(),
});

// Define a type for action responses
interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

/**
 * Server action to initiate Google Calendar OAuth flow
 * This generates an authorization URL and returns it to the client
 */
export const connectGoogleCalendar = actionClient
  .schema(connectGoogleCalendarSchema)
  .action(
    async ({ parsedInput }): Promise<ActionResponse<{ authUrl: string }>> => {
      try {
        // Extract the tool ID and bot ID from the parsed input
        const { toolId, botId, orgId } = parsedInput;

        // Generate a secure state token to prevent CSRF attacks
        const stateToken = randomBytes(32).toString("hex");

        // Store the state token in a cookie for verification when the user returns
        const cookieStore = await cookies();
        cookieStore.set("oauth_state", stateToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 10, // 10 minutes
          path: "/",
        });

        // Store the tool, bot, and org IDs in a cookie for the callback
        cookieStore.set(
          "oauth_params",
          JSON.stringify({ toolId, botId, orgId }),
          {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 10, // 10 minutes
            path: "/",
          }
        );

        // Define the scopes needed for calendar access
        const scopes = [
          "https://www.googleapis.com/auth/calendar",
          "https://www.googleapis.com/auth/calendar.events",
          "https://www.googleapis.com/auth/calendar.readonly",
        ];

        // Create the authorization URL with the proper parameters
        const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
        authUrl.searchParams.append(
          "client_id",
          process.env.GOOGLE_CLIENT_ID || ""
        );
        authUrl.searchParams.append(
          "redirect_uri",
          `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/google`
        );
        authUrl.searchParams.append("response_type", "code");
        authUrl.searchParams.append("scope", scopes.join(" "));
        authUrl.searchParams.append("access_type", "offline");
        authUrl.searchParams.append("prompt", "consent"); // Always prompt for consent to get a refresh token
        authUrl.searchParams.append("state", stateToken);

        return {
          success: true,
          data: {
            authUrl: authUrl.toString(),
          },
        };
      } catch (error) {
        console.error("Error generating Google Calendar auth URL:", error);
        return {
          success: false,
          error: {
            message: "Failed to initiate Google authentication",
          },
        };
      }
    }
  );
