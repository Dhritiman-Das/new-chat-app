import prisma from "@/lib/db/prisma";
import { assistantConversationMessage } from "@/lib/bot-deployments/gohighlevel";
import { NextRequest, NextResponse } from "next/server";
import {
  GoHighLevelWebhookPayload,
  GoHighLevelDeploymentConfig,
} from "@/lib/shared/types/gohighlevel";
import { $Enums } from "@/lib/generated/prisma";
import { redis } from "@/lib/db/kv";
import { TokenContext } from "@/lib/auth/types";
import { verifyWebhookSignature } from "@/lib/auth/services/webhook-verification";

const MAX_ALLOWED_TIME_DIFF_MS = 5 * 60 * 1000; // 5 minutes

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature
    const signature = request.headers.get("x-wh-signature");
    if (!signature) {
      console.error("Missing webhook signature");
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }

    const rawBody = await request.text();
    const isValid = verifyWebhookSignature("gohighlevel", rawBody, signature);

    if (!isValid) {
      console.error("Invalid webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const body = JSON.parse(rawBody) as GoHighLevelWebhookPayload;

    // Validate timestamp to prevent replay attacks
    if (body.timestamp) {
      const timestampMs = new Date(body.timestamp).getTime();
      const currentMs = Date.now();
      if (Math.abs(currentMs - timestampMs) > MAX_ALLOWED_TIME_DIFF_MS) {
        console.error("Webhook timestamp too old");
        return NextResponse.json({ error: "Request too old" }, { status: 400 });
      }
    }

    // Skip requests if they're not inbound messages
    if (body.type !== "InboundMessage" || body.direction !== "inbound") {
      return NextResponse.json({ success: true });
    }

    const { locationId, messageType } = body;

    // Skip duplicate messages - we'll use the message ID from the payload for this in the future
    const gohighlevelMessageKey = `ghl:message:${body.messageId}`;
    const isDuplicate = await redis.get(gohighlevelMessageKey);
    if (isDuplicate) {
      console.log("Duplicate GoHighLevel message, skipping:", body.messageId);
      return NextResponse.json({ success: true });
    }
    // Mark this event as processed for 5 minutes
    await redis.set(gohighlevelMessageKey, "1", { ex: 300 });

    // Find integration for this location
    const integration = await prisma.integration.findFirst({
      where: {
        provider: "gohighlevel",
        metadata: {
          path: ["locationId"],
          equals: locationId,
        },
      },
      include: {
        credential: true,
        bot: true,
        deployments: {
          where: {
            type: $Enums.DeploymentType.GOHIGHLEVEL,
          },
        },
      },
    });

    if (!integration || !integration.credential) {
      console.error(
        "No integration found for GoHighLevel location",
        locationId
      );
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 }
      );
    }

    // Get bot
    const bot = integration.bot;
    if (!bot) {
      console.error("No bot found for GoHighLevel integration");
      return NextResponse.json({ error: "Bot not found" }, { status: 404 });
    }

    // Check if the message type is allowed in the deployment config
    const deployment = integration.deployments[0];
    if (deployment) {
      const config =
        deployment.config as unknown as GoHighLevelDeploymentConfig;
      const channels = config.channels || [];

      // Check if this message type is in the allowed channels list
      const isChannelAllowed = channels.some(
        (ch) => ch.type === messageType && ch.active === true
      );

      if (!isChannelAllowed) {
        console.log(
          `Message type ${messageType} is not in the allowed channels list or is not active`
        );
        return NextResponse.json({ success: true });
      }

      // Check if we need to ignore conversations with kill_switch tag
      if (config.globalSettings?.checkKillSwitch) {
        // The actual check will be done in the message handler
      }
    }

    // Create TokenContext for auth module
    const tokenContext: TokenContext = {
      userId: integration.userId,
      provider: "gohighlevel",
      credentialId: integration.credential.id,
    };

    // Process the message with the AI implementation
    await assistantConversationMessage(body, tokenContext, {
      userId: integration.userId,
      organizationId: bot.organizationId,
      botId: bot.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing GoHighLevel event:", error);
    return NextResponse.json(
      { error: "Failed to process GoHighLevel event" },
      { status: 500 }
    );
  }
}
