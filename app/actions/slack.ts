"use server";

import { createSafeActionClient } from "next-safe-action";
import { z } from "zod";
import type { ActionResponse } from "@/app/actions/types";
import prisma from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { sendMessage, createSlackClient } from "@/lib/bot-deployments/slack";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { v4 as uuidv4 } from "uuid";
import { getSlackIntegrationForBot } from "@/app/(protected)/(sidebar)/dashboard/[orgId]/bots/[botId]/deployments/slack/utils";

const action = createSafeActionClient();

// Schema for Slack connection initialization
const initiateConnectionSchema = z.object({
  botId: z.string(),
  orgId: z.string(),
  isAddingChannel: z.boolean().optional(),
  integrationId: z.string().optional(),
});

// Schema for sending a message to Slack
const sendMessageSchema = z.object({
  integrationId: z.string(),
  channelId: z.string().optional(),
  message: z.string(),
});

// Schema for updating Slack integration settings
const updateSettingsSchema = z.object({
  integrationId: z.string(),
  defaultChannel: z.string().optional(),
  messageStyle: z.enum(["simple", "blocks", "markdown"]).optional(),
  sendThreadedReplies: z.boolean().optional(),
  autoRespondToMentions: z.boolean().optional(),
  autoRespondToDirectMessages: z.boolean().optional(),
  respondToReactions: z.boolean().optional(),
  notificationSettings: z
    .object({
      enabled: z.boolean().optional(),
      customNotification: z.string().optional(),
    })
    .optional(),
});

// Schema for removing a Slack integration
const removeIntegrationSchema = z.object({
  integrationId: z.string(),
});

// Generate and store OAuth state
export async function generateOAuthState(
  userId: string,
  metadata: Record<string, string>
): Promise<string | null> {
  try {
    const state = randomBytes(16).toString("hex");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    await prisma.oAuthState.create({
      data: {
        state,
        userId,
        metadata: JSON.stringify(metadata),
        expiresAt,
      },
    });

    return state;
  } catch (error) {
    console.error("Error generating OAuth state:", error);
    return null;
  }
}

// Initialize Slack connection
export const initiateSlackConnection = action
  .schema(initiateConnectionSchema)
  .action(async ({ parsedInput }): Promise<ActionResponse> => {
    try {
      const session = await auth();
      const { botId, orgId, isAddingChannel, integrationId } = parsedInput;

      if (!session?.user?.id) {
        return {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "You must be logged in to connect Slack",
          },
        };
      }

      // Check if an integration already exists for this bot and provider
      if (!isAddingChannel) {
        const existingIntegrationId = await getSlackIntegrationForBot(botId);

        if (existingIntegrationId) {
          return {
            success: false,
            error: {
              code: "INTEGRATION_EXISTS",
              message: "A Slack integration already exists for this bot",
            },
            data: { integrationId: existingIntegrationId },
          };
        }
      }

      // Generate and store OAuth state
      const state = uuidv4();

      await prisma.oAuthState.create({
        data: {
          state,
          userId: session.user.id,
          metadata: JSON.stringify({
            botId,
            orgId,
            provider: "slack",
            isAddingChannel: isAddingChannel || false,
            integrationId: integrationId || null,
          }),
          expiresAt: new Date(Date.now() + 1000 * 60 * 15), // 15 minutes
        },
      });

      return {
        success: true,
        data: {
          state,
        },
      };
    } catch (error) {
      console.error("Error initiating Slack connection:", error);
      return {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Failed to initiate Slack connection",
        },
      };
    }
  });

// Send a message to Slack
export const sendSlackMessage = action
  .schema(sendMessageSchema)
  .action(async ({ parsedInput }): Promise<ActionResponse> => {
    try {
      const session = await auth();
      const { integrationId, channelId, message } = parsedInput;

      if (!session?.user?.id) {
        return {
          success: false,
          error: {
            code: "NOT_AUTHENTICATED",
            message: "Not authenticated",
          },
        };
      }

      const integration = await prisma.integration.findUnique({
        where: { id: integrationId },
        include: { credential: true },
      });

      if (!integration || !integration.credential) {
        return {
          success: false,
          error: {
            code: "INTEGRATION_OR_CREDENTIALS_NOT_FOUND",
            message: "Integration or credentials not found",
          },
        };
      }

      const credentials = integration.credential.credentials as {
        access_token: string;
      };
      const slackClient = await createSlackClient({
        token: credentials.access_token,
      });

      // Get channel ID to send to
      const targetChannel =
        channelId ||
        (integration.metadata as unknown as { channel_id?: string })
          ?.channel_id ||
        (integration.config as unknown as { defaultChannel?: string })
          ?.defaultChannel;

      if (!targetChannel) {
        return {
          success: false,
          error: {
            code: "NO_TARGET_CHANNEL_SPECIFIED",
            message: "No target channel specified",
          },
        };
      }

      // Send the message
      const sent = await sendMessage(slackClient, targetChannel, message);

      if (!sent) {
        return {
          success: false,
          error: {
            code: "FAILED_TO_SEND_MESSAGE_TO_SLACK",
            message: "Failed to send message to Slack",
          },
        };
      }

      return {
        success: true,
        data: { sent: true },
      };
    } catch (error) {
      console.error("Error sending Slack message:", error);
      return {
        success: false,
        error: {
          code: "FAILED_TO_SEND_MESSAGE_TO_SLACK",
          message: "Failed to send message to Slack",
        },
      };
    }
  });

// Update Slack integration settings
export const updateSlackSettings = action
  .schema(updateSettingsSchema)
  .action(async ({ parsedInput }): Promise<ActionResponse> => {
    try {
      const session = await auth();
      const { integrationId, ...settings } = parsedInput;

      if (!session?.user?.id) {
        return {
          success: false,
          error: {
            code: "NOT_AUTHENTICATED",
            message: "Not authenticated",
          },
        };
      }

      const integration = await prisma.integration.findUnique({
        where: { id: integrationId },
      });

      if (!integration) {
        return {
          success: false,
          error: {
            code: "INTEGRATION_NOT_FOUND",
            message: "Integration not found",
          },
        };
      }

      // Merge existing config with new settings
      const updatedConfig = {
        ...(integration.config as Record<string, unknown>),
        ...settings,
      };

      // Update the integration
      await prisma.integration.update({
        where: { id: integrationId },
        data: {
          config: updatedConfig,
        },
      });

      revalidatePath(`/dashboard/${integration.botId}/settings/slack`);

      return {
        success: true,
        data: { updated: true },
      };
    } catch (error) {
      console.error("Error updating Slack settings:", error);
      return {
        success: false,
        error: {
          code: "FAILED_TO_UPDATE_SLACK_SETTINGS",
          message: "Failed to update Slack settings",
        },
      };
    }
  });

// Remove Slack integration
export const removeSlackIntegration = action
  .schema(removeIntegrationSchema)
  .action(async ({ parsedInput }): Promise<ActionResponse> => {
    try {
      const session = await auth();
      const { integrationId } = parsedInput;

      if (!session?.user?.id) {
        return {
          success: false,
          error: {
            code: "NOT_AUTHENTICATED",
            message: "Not authenticated",
          },
        };
      }

      const integration = await prisma.integration.findUnique({
        where: { id: integrationId },
        include: { credential: true },
      });

      if (!integration) {
        return {
          success: false,
          error: {
            code: "INTEGRATION_NOT_FOUND",
            message: "Integration not found",
          },
        };
      }

      // Delete any deployments using this integration
      await prisma.deployment.deleteMany({
        where: { integrationId },
      });

      // Delete the integration
      await prisma.integration.delete({
        where: { id: integrationId },
      });

      // Optionally delete the credential if no other integration is using it
      if (integration.credentialId) {
        const otherIntegrations = await prisma.integration.findFirst({
          where: {
            credentialId: integration.credentialId,
            id: { not: integrationId },
          },
        });

        if (!otherIntegrations) {
          await prisma.credential.delete({
            where: { id: integration.credentialId },
          });
        }
      }

      if (integration.botId) {
        // Revalidate the path
        revalidatePath(`/dashboard/${integration.botId}/deployments/slack`);
      }

      return {
        success: true,
        data: { removed: true },
      };
    } catch (error) {
      console.error("Error removing Slack integration:", error);
      return {
        success: false,
        error: {
          code: "FAILED_TO_REMOVE_SLACK_INTEGRATION",
          message: "Failed to remove Slack integration",
        },
      };
    }
  });
