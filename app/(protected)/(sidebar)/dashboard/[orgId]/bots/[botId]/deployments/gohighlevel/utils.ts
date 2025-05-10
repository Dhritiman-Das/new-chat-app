import prisma from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { Prisma } from "@/lib/generated/prisma";
import {
  GoHighLevelDeploymentConfig,
  GoHighLevelChannel,
  GoHighLevelGlobalSettings,
} from "@/lib/shared/types/gohighlevel";

export interface GoHighLevelIntegrationConfig {
  maxMessagesToProcess?: number;
  autoRespondToMessages?: boolean;
  notificationSettings?: {
    enabled: boolean;
    customNotification?: string;
  };
  [key: string]: unknown;
}

export interface GoHighLevelIntegration {
  id: string;
  name: string;
  metadata: {
    locationName?: string;
    locationId?: string;
    [key: string]: unknown;
  };
  config?: GoHighLevelIntegrationConfig;
  connectionStatus: string;
  credentialId?: string | null;
  deployment?: {
    id: string;
    config: GoHighLevelDeploymentConfig;
  } | null;
}

// Check if an integration exists for the bot and return it
export async function getGoHighLevelIntegrationForBot(
  botId: string
): Promise<string | null> {
  const integration = await prisma.integration.findFirst({
    where: {
      botId,
      provider: "gohighlevel",
    },
  });

  return integration?.id || null;
}

export async function getGoHighLevelIntegrations(
  botId: string
): Promise<GoHighLevelIntegration[]> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return [];
    }

    const integrations = await prisma.integration.findMany({
      where: {
        botId,
        provider: "gohighlevel",
      },
      include: {
        deployments: {
          where: {
            type: "GOHIGHLEVEL",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Transform the integrations to match our expected interface
    return integrations.map((integration) => ({
      id: integration.id,
      name: integration.name,
      metadata: integration.metadata as GoHighLevelIntegration["metadata"],
      config: integration.config as GoHighLevelIntegrationConfig,
      connectionStatus: integration.connectionStatus,
      credentialId: integration.credentialId,
      deployment:
        integration.deployments.length > 0
          ? {
              id: integration.deployments[0].id,
              config: integration.deployments[0]
                .config as unknown as GoHighLevelDeploymentConfig,
            }
          : null,
    }));
  } catch (error) {
    console.error("Error fetching GoHighLevel integrations:", error);
    return [];
  }
}

// Helper function to create or update a GoHighLevel deployment
export async function createOrUpdateGoHighLevelDeployment(
  botId: string,
  integrationId: string,
  locationId: string,
  channels: GoHighLevelChannel[],
  globalSettings?: GoHighLevelGlobalSettings
) {
  try {
    // Check if deployment already exists
    const existingDeployment = await prisma.deployment.findFirst({
      where: {
        botId,
        integrationId,
        type: "GOHIGHLEVEL",
      },
    });

    const deploymentConfig: GoHighLevelDeploymentConfig = {
      locationId,
      channels,
      globalSettings,
    };

    if (existingDeployment) {
      // Update existing deployment
      return await prisma.deployment.update({
        where: {
          id: existingDeployment.id,
        },
        data: {
          config: deploymentConfig as unknown as Prisma.InputJsonValue,
        },
      });
    } else {
      // Create new deployment
      return await prisma.deployment.create({
        data: {
          botId,
          integrationId,
          type: "GOHIGHLEVEL",
          config: deploymentConfig as unknown as Prisma.InputJsonValue,
        },
      });
    }
  } catch (error) {
    console.error("Error creating/updating GoHighLevel deployment:", error);
    throw error;
  }
}
