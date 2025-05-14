import { App } from "@slack/bolt";
import prisma from "@/lib/db/prisma";
import { $Enums } from "@/lib/generated/prisma";
import { Block } from "@slack/web-api";
import {
  SlackClient,
  createSlackClient as createAuthSlackClient,
  type SlackClientOptions as AuthSlackClientOptions,
} from "@/lib/auth/clients";

export interface SlackClientOptions {
  token: string;
  signingSecret?: string;
}

/**
 * Create a Slack client using the auth system
 */
export async function createSlackClientFromAuth(
  userId: string,
  credentialId?: string,
  botId?: string
): Promise<SlackClient> {
  return createAuthSlackClient({
    userId,
    credentialId,
    botId,
  } satisfies AuthSlackClientOptions);
}

export async function sendMessage(
  slackClient: App | SlackClient,
  channelId: string,
  message: string
) {
  try {
    if (slackClient instanceof SlackClient) {
      await slackClient.sendMessage(channelId, message);
    } else {
      await slackClient.client.chat.postMessage({
        channel: channelId,
        text: message,
      });
    }
    return true;
  } catch (error) {
    console.error("Error sending Slack message:", error);
    return false;
  }
}

export async function sendBlockMessage(
  slackClient: App | SlackClient,
  channelId: string,
  blocks: Block[] // Slack blocks
) {
  try {
    if (slackClient instanceof SlackClient) {
      const app = await slackClient.getApp();
      await app.client.chat.postMessage({
        channel: channelId,
        blocks,
      });
    } else {
      await slackClient.client.chat.postMessage({
        channel: channelId,
        blocks,
      });
    }
    return true;
  } catch (error) {
    console.error("Error sending Slack block message:", error);
    return false;
  }
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

export * from "./lib";
