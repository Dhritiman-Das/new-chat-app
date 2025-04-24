import prisma from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { Prisma } from "@/lib/generated/prisma";

export interface SlackChannel {
  channelId: string;
  channelName: string;
  active: boolean;
  settings?: {
    mentionsOnly?: boolean;
    [key: string]: unknown;
  };
}

export interface SlackGlobalSettings {
  defaultResponseTime?: string;
  [key: string]: unknown;
}

export interface SlackDeploymentConfig {
  channels?: SlackChannel[];
  globalSettings?: SlackGlobalSettings;
}

export interface SlackIntegrationConfig {
  maxMessagesToProcess?: number;
  messageStyle?: "simple" | "blocks" | "markdown";
  sendThreadedReplies?: boolean;
  autoRespondToMentions?: boolean;
  autoRespondToDirectMessages?: boolean;
  respondToReactions?: boolean;
  notificationSettings?: {
    enabled: boolean;
    customNotification?: string;
  };
  [key: string]: unknown;
}

export interface SlackIntegration {
  id: string;
  name: string;
  metadata: {
    team_name?: string;
    channel?: string;
    [key: string]: unknown;
  };
  config?: SlackIntegrationConfig;
  connectionStatus: string;
  credentialId?: string | null;
  deployment?: {
    id: string;
    config: SlackDeploymentConfig;
  } | null;
}

// Check if an integration exists for the bot and return it
export async function getSlackIntegrationForBot(
  botId: string
): Promise<string | null> {
  const integration = await prisma.integration.findFirst({
    where: {
      botId,
      provider: "slack",
    },
  });

  return integration?.id || null;
}

export async function getSlackIntegrations(
  botId: string
): Promise<SlackIntegration[]> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return [];
    }

    const integrations = await prisma.integration.findMany({
      where: {
        botId,
        provider: "slack",
      },
      include: {
        deployments: {
          where: {
            type: "SLACK",
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
      metadata: integration.metadata as SlackIntegration["metadata"],
      config: integration.config as SlackIntegrationConfig,
      connectionStatus: integration.connectionStatus,
      credentialId: integration.credentialId,
      deployment:
        integration.deployments.length > 0
          ? {
              id: integration.deployments[0].id,
              config: integration.deployments[0]
                .config as SlackDeploymentConfig,
            }
          : null,
    }));
  } catch (error) {
    console.error("Error fetching Slack integrations:", error);
    return [];
  }
}

// Helper function to create or update a Slack deployment
export async function createOrUpdateSlackDeployment(
  botId: string,
  integrationId: string,
  channels: SlackChannel[],
  globalSettings?: SlackGlobalSettings
) {
  try {
    // Check if deployment already exists
    const existingDeployment = await prisma.deployment.findFirst({
      where: {
        botId,
        integrationId,
        type: "SLACK",
      },
    });

    const deploymentConfig: SlackDeploymentConfig = {
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
          type: "SLACK",
          config: deploymentConfig as unknown as Prisma.InputJsonValue,
        },
      });
    }
  } catch (error) {
    console.error("Error creating/updating Slack deployment:", error);
    throw error;
  }
}
