import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { $Enums } from "@/lib/generated/prisma";
import { getSlackIntegrationForBot } from "@/app/(protected)/(sidebar)/dashboard/[orgId]/bots/[botId]/deployments/slack/utils";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { botId, credentialId, teamName, channelName } = await req.json();

    if (!botId || !credentialId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if an integration already exists for this bot and provider
    const existingIntegrationId = await getSlackIntegrationForBot(botId);

    if (existingIntegrationId) {
      return NextResponse.json(
        {
          error: "Integration already exists for this bot",
          integrationId: existingIntegrationId,
        },
        { status: 409 }
      );
    }

    // Create the integration
    const integration = await prisma.integration.create({
      data: {
        userId: session.user.id,
        botId,
        provider: "slack",
        name: `Slack Integration (${teamName || "Unknown"})`,
        type: $Enums.IntegrationType.MESSENGER,
        credentialId,
        authCredentials: {}, // Empty as we use the credential record
        metadata: {
          team_name: teamName,
          channel: channelName || "general",
        },
        config: {
          MAX_MESSAGES_TO_PROCESS: 10,
          messageStyle: "blocks",
          sendThreadedReplies: true,
          autoRespondToMentions: true,
          autoRespondToDirectMessages: true,
          respondToReactions: false,
          notificationSettings: {
            enabled: false,
          },
        },
      },
    });

    // Create the deployment
    const deployment = await prisma.deployment.create({
      data: {
        botId,
        integrationId: integration.id,
        type: "SLACK",
        config: {
          channels: [
            {
              channelId: channelName || "general",
              channelName: channelName || "general",
              active: true,
              settings: {
                mentionsOnly: false,
              },
            },
          ],
          globalSettings: {
            defaultResponseTime: "immediate",
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        integration,
        deployment,
      },
    });
  } catch (error) {
    console.error("Error connecting Slack:", error);
    return NextResponse.json(
      { error: "Failed to connect Slack integration" },
      { status: 500 }
    );
  }
}
