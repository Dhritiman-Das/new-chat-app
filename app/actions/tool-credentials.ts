"use server";

import { createSafeActionClient } from "next-safe-action";
import { z } from "zod";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { getCalendarsForCredential as getGoogleCalendars } from "@/lib/auth/services";
import { ActionResponse, appErrors } from "./types";
import {
  getAuthUrl,
  gohighlevelConfig,
} from "@/lib/auth/config/providers-config";

const actionClient = createSafeActionClient();

/**
 * Helper function to check if a credential is used by other resources
 * Returns true if the credential is being used by bot tools or integrations
 */
async function isCredentialInUse(
  credentialId: string,
  excludeBotToolId?: string
): Promise<boolean> {
  // Check if credential is used by any bot tools (excluding the one being disconnected)
  const botToolsUsingCredential = await prisma.botTool.count({
    where: {
      credentialId,
      ...(excludeBotToolId
        ? {
            id: {
              not: excludeBotToolId,
            },
          }
        : {}),
    },
  });

  // Check if credential is used by any integrations
  const integrationsUsingCredential = await prisma.integration.count({
    where: {
      credentialId,
    },
  });

  return botToolsUsingCredential > 0 || integrationsUsingCredential > 0;
}

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

        // Use the auth system to generate the authorization URL
        const authUrl = getAuthUrl("google", stateToken);

        return {
          success: true,
          data: {
            authUrl,
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
      const result = await disconnectProvider(userId, toolId, "google");

      if (result.success) {
        return {
          success: true,
          data: {
            message:
              result.message || "Google Calendar disconnected successfully",
          },
        };
      } else {
        return {
          success: false,
          error: result.error || {
            code: "GOOGLE_DISCONNECT_FAILED",
            message: "Failed to disconnect Google Calendar",
          },
        };
      }
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
        const session = await auth();
        if (!session?.user?.id) {
          return {
            success: false,
            error: appErrors.UNAUTHORIZED,
          };
        }

        // Extract the tool ID and bot ID from the parsed input
        const { toolId, botId, orgId } = parsedInput;

        // Generate a secure state token to prevent CSRF attacks
        const stateToken = randomBytes(32).toString("hex");

        await prisma.oAuthState.create({
          data: {
            state: stateToken,
            userId: session.user.id,
            metadata: JSON.stringify({
              botId,
              orgId,
              provider: "gohighlevel",
              isAddingChannel: false,
              integrationId: null,
            }),
            expiresAt: new Date(Date.now() + 1000 * 60 * 15), // 15 minutes
          },
        });

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
      const result = await disconnectProvider(userId, toolId, "gohighlevel");

      if (result.success) {
        return {
          success: true,
          data: {
            message: result.message || "GoHighLevel disconnected successfully",
          },
        };
      } else {
        return {
          success: false,
          error: result.error || {
            code: "GOHIGHLEVEL_DISCONNECT_FAILED",
            message: "Failed to disconnect GoHighLevel",
          },
        };
      }
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

/**
 * Helper function to safely disconnect a provider from a tool
 * This will check if the credential is used elsewhere before deleting
 */
async function disconnectProvider(
  userId: string,
  toolId: string,
  provider: string
): Promise<{
  success: boolean;
  message?: string;
  error?: { code: string; message: string };
}> {
  try {
    // Find the bot tool first to get credential relationship
    const botTool = await prisma.botTool.findFirst({
      where: {
        botId: toolId,
        tool: {
          integrationType: provider,
        },
      },
      include: {
        credential: true,
      },
    });

    // If we have a related credential through bot tool
    if (botTool?.credential) {
      const credentialId = botTool.credential.id;

      // Clear the credentialId on the bot tool
      await prisma.botTool.update({
        where: {
          id: botTool.id,
        },
        data: {
          credentialId: null,
        },
      });

      // Check if the credential is still in use by other resources
      const stillInUse = await isCredentialInUse(credentialId, botTool.id);

      // Delete credential only if it's not used anywhere else
      if (!stillInUse) {
        await prisma.credential.delete({
          where: {
            id: credentialId,
          },
        });
      }

      return {
        success: true,
        message: `${provider} disconnected successfully`,
      };
    }

    // Check for a direct credential
    const credential = await prisma.credential.findFirst({
      where: {
        provider,
        botId: toolId,
      },
    });

    if (credential) {
      // Check if the credential is used by any other resources
      const stillInUse = await isCredentialInUse(credential.id);

      // Delete credential only if it's not used anywhere else
      if (!stillInUse) {
        await prisma.credential.delete({
          where: {
            id: credential.id,
          },
        });
      }

      return {
        success: true,
        message: `${provider} disconnected successfully`,
      };
    }

    // Try to find any credential associated with this user and provider
    // (legacy search for older credential formats)
    const legacyCredential = await prisma.credential.findFirst({
      where: {
        userId,
        provider,
      },
    });

    if (legacyCredential) {
      // Update any related bot tools to remove the credential ID
      await prisma.botTool.updateMany({
        where: {
          credentialId: legacyCredential.id,
        },
        data: {
          credentialId: null,
        },
      });

      // Check if the credential is still in use by other resources
      const stillInUse = await isCredentialInUse(legacyCredential.id);

      // Delete credential only if it's not used anywhere else
      if (!stillInUse) {
        await prisma.credential.delete({
          where: {
            id: legacyCredential.id,
          },
        });
      }

      return {
        success: true,
        message: `${provider} disconnected successfully`,
      };
    }

    return {
      success: false,
      error: {
        code: `${provider.toUpperCase()}_NOT_CONNECTED`,
        message: `${provider} is not connected`,
      },
    };
  } catch (error) {
    console.error(`Error disconnecting ${provider}:`, error);
    return {
      success: false,
      error: {
        code: `${provider.toUpperCase()}_DISCONNECT_FAILED`,
        message: `Failed to disconnect ${provider}`,
      },
    };
  }
}
