import prisma from "@/lib/db/prisma";
import { createSlackClient } from "@/lib/bot-deployments/slack";
import { assistantThreadMessage } from "@/lib/bot-deployments/slack/lib/events/thread";
import { NextRequest, NextResponse } from "next/server";

// Define interfaces for type-safe deployment config
interface SlackChannelConfig {
  channelId: string;
  channelName: string;
  active: boolean;
  settings?: {
    mentionsOnly?: boolean;
    [key: string]: unknown;
  };
}

interface SlackDeploymentConfig {
  channels?: SlackChannelConfig[];
  globalSettings?: {
    defaultResponseTime?: string;
    [key: string]: unknown;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Handle URL verification challenge from Slack
    if (body.type === "url_verification") {
      return NextResponse.json({ challenge: body.challenge });
    }

    // Make sure event exists
    if (!body.event) {
      console.error("No event in request body");
      return NextResponse.json(
        { error: "No event in request body" },
        { status: 400 }
      );
    }

    // Skip retries
    const slackEventKey = `slack:event:${body.event_id}`;
    if (body.event_id && body.event_id === slackEventKey) {
      console.log("Skipping duplicate Slack event");
      return NextResponse.json({ success: true });
    }

    // Handle app_mention event - this is the key change
    if (body.event?.type === "app_mention") {
      const { team: team_id, channel } = body.event;

      // Find integration for this team
      const integration = await prisma.integration.findFirst({
        where: {
          provider: "slack",
          metadata: {
            path: ["team_id"],
            equals: team_id,
          },
        },
        include: {
          credential: true,
          bot: true,
          deployments: {
            where: {
              type: "SLACK",
            },
          },
        },
      });

      if (!integration || !integration.credential) {
        console.error("No integration found for Slack team", team_id);
        return NextResponse.json(
          { error: "Integration not found" },
          { status: 404 }
        );
      }

      // Get bot
      const bot = integration.bot;
      if (!bot) {
        console.error("No bot found for Slack integration");
        return NextResponse.json({ error: "Bot not found" }, { status: 404 });
      }

      // Check if the channel is allowed in the deployment config
      const deployment = integration.deployments[0];
      if (deployment) {
        const config = deployment.config as SlackDeploymentConfig;
        const channels = config.channels || [];

        // Check if this channel is in the allowed channels list
        const isChannelAllowed = channels.some(
          (ch) => ch.channelId === channel && ch.active === true
        );

        if (!isChannelAllowed) {
          console.log(
            `Channel ${channel} is not in the allowed channels list or is not active`
          );
          return NextResponse.json({ success: true });
        }
      }

      // Create client
      const credentials = integration.credential.credentials as {
        access_token: string;
      };
      const slackClient = await createSlackClient({
        token: credentials.access_token,
      });

      // Process the mention with the AI implementation
      await assistantThreadMessage(body.event, slackClient.client, {
        userId: integration.userId,
        organizationId: bot.organizationId,
        botId: bot.id,
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing Slack event:", error);
    return NextResponse.json(
      { error: "Failed to process Slack event" },
      { status: 500 }
    );
  }
}
