import { App } from "@slack/bolt";
import { slackConfig } from "./config";
import prisma from "@/lib/db/prisma";
import { $Enums } from "@/lib/generated/prisma";
import { Block } from "@slack/web-api";

export interface SlackClientOptions {
  token: string;
  signingSecret?: string;
}

export interface SlackCredentials {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  scope?: string;
  team_id?: string;
  team_name?: string;
}

export async function createSlackClient(options: SlackClientOptions) {
  const slackApp = new App({
    token: options.token,
    signingSecret: options.signingSecret || slackConfig.signingSecret,
  });

  return slackApp;
}

export async function sendMessage(
  slackClient: App,
  channelId: string,
  message: string
) {
  try {
    await slackClient.client.chat.postMessage({
      channel: channelId,
      text: message,
    });
    return true;
  } catch (error) {
    console.error("Error sending Slack message:", error);
    return false;
  }
}

export async function sendBlockMessage(
  slackClient: App,
  channelId: string,
  blocks: Block[] // Slack blocks
) {
  try {
    await slackClient.client.chat.postMessage({
      channel: channelId,
      blocks,
    });
    return true;
  } catch (error) {
    console.error("Error sending Slack block message:", error);
    return false;
  }
}

export async function getSlackClient(userId: string) {
  const credential = await prisma.credential.findFirst({
    where: {
      userId,
      provider: "slack",
    },
  });

  if (!credential) {
    throw new Error("Slack credentials not found");
  }

  const credentials = credential.credentials as unknown as SlackCredentials;

  return createSlackClient({
    token: credentials.access_token,
  });
}

export async function getActiveSlackIntegrations(botId: string) {
  const integrations = await prisma.integration.findMany({
    where: {
      botId,
      provider: "slack",
      connectionStatus: $Enums.ConnectionStatus.CONNECTED,
    },
    include: {
      credential: true,
      deployments: {
        where: {
          type: "SLACK",
        },
      },
    },
  });

  return integrations;
}
