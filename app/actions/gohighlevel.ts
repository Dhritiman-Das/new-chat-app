"use server";

import { createSafeActionClient } from "next-safe-action";
import { z } from "zod";
import type { ActionResponse } from "@/app/actions/types";
import prisma from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";
import { revalidatePath } from "next/cache";
import { getGoHighLevelIntegrationForBot } from "@/app/(protected)/(sidebar)/dashboard/[orgId]/bots/[botId]/deployments/gohighlevel/utils";
import { GoHighLevelMessageType } from "@/lib/shared/types/gohighlevel";
import { DeploymentType, Prisma } from "@/lib/generated/prisma";
import type { Calendar } from "@/components/tools/gohighlevel-calendar/types";
import { TokenContext } from "@/lib/auth/types";
import { createClient } from "@/lib/auth/provider-registry";
import { GoHighLevelClient } from "@/lib/auth/clients";

const action = createSafeActionClient();

// Schema for GoHighLevel connection initialization
const initiateConnectionSchema = z.object({
  botId: z.string(),
  orgId: z.string(),
  isAddingChannel: z.boolean().optional(),
  integrationId: z.string().optional(),
});

// Schema for updating GoHighLevel channel settings
const updateChannelSettingsSchema = z.object({
  integrationId: z.string(),
  deploymentId: z.string().optional(),
  channels: z.array(
    z.object({
      type: z.enum([
        "SMS",
        "Email",
        "WhatsApp",
        "IG",
        "FB",
        "Custom",
        "Live_Chat",
        "CALL",
      ] as [GoHighLevelMessageType, ...GoHighLevelMessageType[]]),
      active: z.boolean(),
      settings: z.record(z.unknown()).optional(),
    })
  ),
});

// Schema for removing a GoHighLevel integration
const removeIntegrationSchema = z.object({
  integrationId: z.string(),
});

// Schema for fetching GoHighLevel calendars
const fetchCalendarsSchema = z.object({
  credentialId: z.string(),
});

// Schema for updating GoHighLevel access code
const updateAccessCodeSchema = z.object({
  integrationId: z.string(),
  deploymentId: z.string().optional(),
  accessCode: z.string().optional(),
});

// Initialize GoHighLevel connection
export const initiateGoHighLevelConnection = action
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
            message: "You must be logged in to connect GoHighLevel",
          },
        };
      }

      // Check if an integration already exists for this bot and provider
      if (!isAddingChannel) {
        const existingIntegrationId = await getGoHighLevelIntegrationForBot(
          botId
        );

        if (existingIntegrationId) {
          return {
            success: false,
            error: {
              code: "INTEGRATION_EXISTS",
              message: "A GoHighLevel integration already exists for this bot",
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
            provider: "gohighlevel",
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
      console.error("Error initiating GoHighLevel connection:", error);
      return {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Failed to initiate GoHighLevel connection",
        },
      };
    }
  });

// Update GoHighLevel channel settings
export const updateGoHighLevelChannels = action
  .schema(updateChannelSettingsSchema)
  .action(async ({ parsedInput }): Promise<ActionResponse> => {
    try {
      const session = await auth();
      const { integrationId, deploymentId, channels } = parsedInput;

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
        include: {
          bot: true,
          deployments: {
            where: {
              type: DeploymentType.GOHIGHLEVEL,
            },
          },
        },
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

      // Get the location ID from integration metadata
      const locationId = (integration.metadata as Record<string, unknown>)
        ?.locationId;

      if (!locationId) {
        return {
          success: false,
          error: {
            code: "LOCATION_ID_NOT_FOUND",
            message: "Location ID not found in integration metadata",
          },
        };
      }

      // Update or create deployment
      const deploymentConfig = {
        locationId,
        channels,
      };

      let updatedDeployment;

      if (deploymentId || integration.deployments.length > 0) {
        // Update existing deployment
        updatedDeployment = await prisma.deployment.update({
          where: {
            id: deploymentId || integration.deployments[0].id,
          },
          data: {
            config: deploymentConfig as unknown as Prisma.InputJsonValue,
          },
        });
      } else {
        // Create new deployment
        updatedDeployment = await prisma.deployment.create({
          data: {
            botId: integration.botId,
            integrationId: integration.id,
            type: DeploymentType.GOHIGHLEVEL,
            config: deploymentConfig as unknown as Prisma.InputJsonValue,
          },
        });
      }

      // Revalidate paths to reflect changes
      revalidatePath(
        `/dashboard/${integration.bot.organizationId}/bots/${integration.botId}/deployments/gohighlevel`
      );

      return {
        success: true,
        data: { deployment: updatedDeployment },
      };
    } catch (error) {
      console.error("Error updating GoHighLevel channels:", error);
      return {
        success: false,
        error: {
          code: "FAILED_TO_UPDATE_CHANNELS",
          message: "Failed to update GoHighLevel channels",
        },
      };
    }
  });

// Remove GoHighLevel integration
export const removeGoHighLevelIntegration = action
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

      // Find the integration with its bot to get the organization ID for path revalidation
      const integration = await prisma.integration.findUnique({
        where: { id: integrationId },
        include: { bot: true },
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
      /**
       * Check if the credential is used by GoHighLevel calendar for the bot:
       * a. if yes then dont remove the credential
       * b. if no then remove the credential
       *  */
      const botTool = await prisma.botTool.findFirst({
        where: {
          botId: integration.botId,
          toolId: "gohighlevel-calendar",
          credentialId: integration.credentialId,
        },
      });

      if (!botTool && integration.credentialId) {
        // Remove the credential
        await prisma.credential.delete({
          where: { id: integration.credentialId },
        });
      }

      // Delete associated deployments
      await prisma.deployment.deleteMany({
        where: {
          integrationId,
          type: DeploymentType.GOHIGHLEVEL,
        },
      });

      // Delete the integration
      await prisma.integration.delete({
        where: { id: integrationId },
      });

      // Revalidate paths to reflect changes
      revalidatePath(
        `/dashboard/${integration.bot.organizationId}/bots/${integration.botId}/deployments/gohighlevel`
      );

      return {
        success: true,
        data: { deleted: true },
      };
    } catch (error) {
      console.error("Error removing GoHighLevel integration:", error);
      return {
        success: false,
        error: {
          code: "FAILED_TO_REMOVE_INTEGRATION",
          message: "Failed to remove GoHighLevel integration",
        },
      };
    }
  });

// Fetch GoHighLevel calendars using server-side code
export const fetchGoHighLevelCalendars = action
  .schema(fetchCalendarsSchema)
  .action(async ({ parsedInput }): Promise<ActionResponse<Calendar[]>> => {
    try {
      const session = await auth();
      const { credentialId } = parsedInput;

      if (!session?.user?.id) {
        return {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "You must be logged in to fetch calendars",
          },
        };
      }

      // Create token context
      const tokenContext: TokenContext = {
        userId: session.user.id,
        provider: "gohighlevel",
        credentialId,
      };

      try {
        // Get the calendars using the auth library's calendar service
        const ghlClient = await createClient<GoHighLevelClient>(tokenContext);

        if (!ghlClient) {
          console.error(
            "Failed to create GoHighLevelClient - client is null or undefined"
          );
          return {
            success: false,
            error: {
              code: "CLIENT_CREATION_FAILED",
              message: "Failed to create GoHighLevel client",
            },
          };
        }
        const calendars = await ghlClient.calendar.getCalendars();

        return {
          success: true,
          data: calendars,
        };
      } catch (clientError) {
        console.error(
          "Error in client creation or calendar fetching:",
          clientError
        );
        return {
          success: false,
          error: {
            code: "CLIENT_ERROR",
            message: `Error with GoHighLevel client: ${
              clientError instanceof Error
                ? clientError.message
                : String(clientError)
            }`,
          },
        };
      }
    } catch (error) {
      console.error("Error fetching GoHighLevel calendars:", error);
      return {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: `Failed to fetch GoHighLevel calendars: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      };
    }
  });

// Update GoHighLevel access code
export const updateGoHighLevelAccessCode = action
  .schema(updateAccessCodeSchema)
  .action(async ({ parsedInput }): Promise<ActionResponse> => {
    try {
      const session = await auth();
      const { integrationId, deploymentId, accessCode } = parsedInput;

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
        include: {
          bot: true,
          deployments: {
            where: {
              type: DeploymentType.GOHIGHLEVEL,
            },
          },
        },
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

      // Get the existing deployment
      const deployment = integration.deployments[0];
      if (!deployment) {
        return {
          success: false,
          error: {
            code: "DEPLOYMENT_NOT_FOUND",
            message: "Deployment not found",
          },
        };
      }

      // Get current config and update global settings
      const currentConfig = deployment.config as unknown as {
        locationId: string;
        channels: unknown[];
        globalSettings?: Record<string, unknown>;
      };

      const updatedConfig = {
        ...currentConfig,
        globalSettings: {
          ...currentConfig.globalSettings,
          accessCode: accessCode?.trim() || undefined,
        },
      };

      // Update deployment with new access code
      const updatedDeployment = await prisma.deployment.update({
        where: {
          id: deploymentId || deployment.id,
        },
        data: {
          config: updatedConfig as unknown as Prisma.InputJsonValue,
        },
      });

      // Revalidate paths to reflect changes
      revalidatePath(
        `/dashboard/${integration.bot.organizationId}/bots/${integration.botId}/deployments/gohighlevel/settings`
      );

      return {
        success: true,
        data: { deployment: updatedDeployment },
      };
    } catch (error) {
      console.error("Error updating GoHighLevel access code:", error);
      return {
        success: false,
        error: {
          code: "FAILED_TO_UPDATE_ACCESS_CODE",
          message: "Failed to update GoHighLevel access code",
        },
      };
    }
  });
