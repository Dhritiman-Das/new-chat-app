"use server";

import { createSafeActionClient } from "next-safe-action";
import { z } from "zod";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { getCalendarsForCredential as getGoogleCalendars } from "@/lib/tools/google-calendar/services/credentials-service";
import { ActionResponse, appErrors } from "./types";
import {
  getAuthUrl,
  gohighlevelConfig,
} from "@/lib/auth/config/providers-config";

const actionClient = createSafeActionClient();

// Define the Calendar interface here for proper typing
interface Calendar {
  id: string;
  name: string;
  isPrimary?: boolean;
  description?: string;
  backgroundColor?: string;
  foregroundColor?: string;
}

// Schema for connect Google Calendar input
const connectGoogleCalendarSchema = z.object({
  toolId: z.string(),
  botId: z.string(),
  orgId: z.string(),
});

// Schema for connect GoHighLevel input
const connectGoHighLevelSchema = z.object({
  toolId: z.string(),
  botId: z.string(),
  orgId: z.string(),
});

/**
 * Server action to fetch calendars for a credential
 */
export const getCalendarsForCredential = actionClient
  .schema(z.object({ credentialId: z.string() }))
  .action(async ({ parsedInput }): Promise<ActionResponse<Calendar[]>> => {
    try {
      const { credentialId } = parsedInput;

      // Get the authenticated user
      const session = await auth();
      if (!session?.user?.id) {
        return {
          success: false,
          error: appErrors.UNAUTHORIZED,
        };
      }

      const userId = session.user.id;

      // Verify the credential belongs to this user
      const credential = await prisma.credential.findFirst({
        where: {
          id: credentialId,
          userId,
        },
      });

      if (!credential) {
        return {
          success: false,
          error: {
            code: "CREDENTIAL_NOT_FOUND",
            message: "Credential not found",
          },
        };
      }

      // Fetch calendars
      const calendars = await getGoogleCalendars(credentialId);

      return {
        success: true,
        data: calendars as Calendar[],
      };
    } catch (error) {
      console.error("Error fetching calendars:", error);
      return {
        success: false,
        error: {
          code: "FETCH_CALENDARS_ERROR",
          message: "Failed to fetch calendars",
        },
      };
    }
  });

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
            code: "GOOGLE_AUTH_FAILED",
            message: "Failed to initiate Google authentication",
          },
        };
      }
    }
  );

/**
 * Server action to disconnect Google Calendar
 */
export const disconnectGoogleCalendar = actionClient
  .schema(
    z.object({
      toolId: z.string(),
    })
  )
  .action(async ({ parsedInput }): Promise<ActionResponse> => {
    try {
      const { toolId } = parsedInput;

      // Get the authenticated user
      const session = await auth();
      if (!session?.user?.id) {
        return {
          success: false,
          error: appErrors.UNAUTHORIZED,
        };
      }

      const userId = session.user.id;

      // Find the bot tool first to get credential relationship
      const botTool = await prisma.botTool.findFirst({
        where: {
          botId: toolId,
          tool: {
            integrationType: "google",
          },
        },
        include: {
          credential: true,
        },
      });

      // If we have a related credential through bot tool
      if (botTool?.credential) {
        // Clear the credentialId on the bot tool
        await prisma.botTool.update({
          where: {
            id: botTool.id,
          },
          data: {
            credentialId: null,
          },
        });

        // If the credential is used only by this bot tool, delete it
        const otherBotToolsUsingCredential = await prisma.botTool.count({
          where: {
            credentialId: botTool.credential.id,
            id: {
              not: botTool.id,
            },
          },
        });

        if (otherBotToolsUsingCredential === 0) {
          // No other bot tools use this credential, so we can safely delete it
          await prisma.credential.delete({
            where: {
              id: botTool.credential.id,
            },
          });
        }

        return {
          success: true,
          data: {
            message: "Google Calendar disconnected successfully",
          },
        };
      }

      // Check for a direct credential (legacy flow)
      const credential = await prisma.credential.findFirst({
        where: {
          userId,
          provider: "google",
        },
      });

      if (!credential) {
        // Last resort, check for old tool credential
        const oldCredential = await prisma.credential.findFirst({
          where: {
            userId,
            provider: "google",
          },
        });

        if (oldCredential) {
          // Delete the old credential
          await prisma.credential.delete({
            where: {
              id: oldCredential.id,
            },
          });

          // Update any related bot tools to remove the credential ID
          await prisma.botTool.updateMany({
            where: {
              credentialId: oldCredential.id,
            },
            data: {
              credentialId: null,
            },
          });

          return {
            success: true,
            data: {
              message: "Google Calendar disconnected successfully",
            },
          };
        }

        return {
          success: false,
          error: {
            code: "GOOGLE_NOT_CONNECTED",
            message: "Google Calendar is not connected",
          },
        };
      }

      // Delete the credential
      await prisma.credential.delete({
        where: {
          id: credential.id,
        },
      });

      return {
        success: true,
        data: {
          message: "Google Calendar disconnected successfully",
        },
      };
    } catch (error) {
      console.error("Error disconnecting Google Calendar:", error);
      return {
        success: false,
        error: {
          code: "GOOGLE_DISCONNECT_FAILED",
          message: "Failed to disconnect Google Calendar",
        },
      };
    }
  });

/**
 * Server action to initiate GoHighLevel OAuth flow
 * This generates an authorization URL and returns it to the client
 */
export const connectGoHighLevel = actionClient
  .schema(connectGoHighLevelSchema)
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

        // Use the auth system to generate the authorization URL
        // Override the redirectUri in gohighlevelConfig temporarily if needed
        const redirectUri =
          process.env.NEXT_PUBLIC_GOHIGHLEVEL_OAUTH_REDIRECT_URL;
        const originalRedirectUri = gohighlevelConfig.redirectUri;

        if (redirectUri && redirectUri !== originalRedirectUri) {
          gohighlevelConfig.redirectUri = redirectUri;
        }

        const authUrl = getAuthUrl("gohighlevel", stateToken);

        // Restore the original redirectUri if we changed it
        if (redirectUri && redirectUri !== originalRedirectUri) {
          gohighlevelConfig.redirectUri = originalRedirectUri;
        }

        return {
          success: true,
          data: {
            authUrl,
          },
        };
      } catch (error) {
        console.error("Error generating GoHighLevel auth URL:", error);
        return {
          success: false,
          error: {
            code: "GOHIGHLEVEL_AUTH_FAILED",
            message: "Failed to initiate GoHighLevel authentication",
          },
        };
      }
    }
  );

/**
 * Server action to disconnect GoHighLevel
 */
export const disconnectGoHighLevel = actionClient
  .schema(
    z.object({
      toolId: z.string(),
    })
  )
  .action(async ({ parsedInput }): Promise<ActionResponse> => {
    try {
      const { toolId } = parsedInput;

      // Get the authenticated user
      const session = await auth();
      if (!session?.user?.id) {
        return {
          success: false,
          error: appErrors.UNAUTHORIZED,
        };
      }

      const userId = session.user.id;

      // Find the bot tool first to get credential relationship
      const botTool = await prisma.botTool.findFirst({
        where: {
          botId: toolId,
          tool: {
            integrationType: "gohighlevel",
          },
        },
        include: {
          credential: true,
        },
      });

      // If we have a related credential through bot tool
      if (botTool?.credential) {
        // Clear the credentialId on the bot tool
        await prisma.botTool.update({
          where: {
            id: botTool.id,
          },
          data: {
            credentialId: null,
          },
        });

        // If the credential is used only by this bot tool, delete it
        const otherBotToolsUsingCredential = await prisma.botTool.count({
          where: {
            credentialId: botTool.credential.id,
            id: {
              not: botTool.id,
            },
          },
        });

        if (otherBotToolsUsingCredential === 0) {
          // No other bot tools use this credential, so we can safely delete it
          await prisma.credential.delete({
            where: {
              id: botTool.credential.id,
            },
          });
        }

        return {
          success: true,
          data: {
            message: "GoHighLevel disconnected successfully",
          },
        };
      }

      // Check for a direct credential (legacy flow)
      const credential = await prisma.credential.findFirst({
        where: {
          userId,
          provider: "gohighlevel",
        },
      });

      if (!credential) {
        return {
          success: false,
          error: {
            code: "GOHIGHLEVEL_NOT_CONNECTED",
            message: "GoHighLevel is not connected",
          },
        };
      }

      // Delete the credential
      await prisma.credential.delete({
        where: {
          id: credential.id,
        },
      });

      return {
        success: true,
        data: {
          message: "GoHighLevel disconnected successfully",
        },
      };
    } catch (error) {
      console.error("Error disconnecting GoHighLevel:", error);
      return {
        success: false,
        error: {
          code: "GOHIGHLEVEL_DISCONNECT_FAILED",
          message: "Failed to disconnect GoHighLevel",
        },
      };
    }
  });
