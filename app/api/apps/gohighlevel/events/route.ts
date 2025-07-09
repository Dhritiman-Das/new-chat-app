import prisma from "@/lib/db/prisma";
import { assistantConversationMessage } from "@/lib/bot-deployments/gohighlevel";
import { NextRequest, NextResponse } from "next/server";
import {
  GoHighLevelWebhookPayload,
  GoHighLevelDeploymentConfig,
  GoHighLevelContactTagUpdatePayload,
} from "@/lib/shared/types/gohighlevel";
import { $Enums } from "@/lib/generated/prisma";
import { redis } from "@/lib/db/kv";
import { TokenContext } from "@/lib/auth/types";
import { verifyWebhookSignature } from "@/lib/auth/services/webhook-verification";
import { getSchedulerService } from "@/lib/scheduler";
import { processChatRequest } from "@/app/actions/ai/chat/process";
import { CoreMessage } from "ai";

const MAX_ALLOWED_TIME_DIFF_MS = 5 * 60 * 1000; // 5 minutes
const MAX_MESSAGE_CONTEXT_LENGTH = 5;
const DEFAULT_RE_ENGAGEMENT_MESSAGE =
  "Hi! I noticed you missed your appointment. Would you like to reschedule?";

/**
 * Generate an AI-powered re-engagement message using recent conversation context
 */
async function generateReEngagementMessage(
  contactId: string,
  locationId: string,
  tokenContext: TokenContext,
  bot: {
    id: string;
    defaultModelId?: string | null;
    userId: string;
    organizationId: string;
  },
  triggerTag: string,
  customPrompt?: string
): Promise<string> {
  try {
    // Import and create GoHighLevel client
    const { createGoHighLevelClient } = await import(
      "@/lib/auth/clients/gohighlevel/index"
    );
    const ghlClient = await createGoHighLevelClient(tokenContext, locationId);

    // Get recent conversations for the contact
    const conversations = await ghlClient.messaging.searchConversations({
      contactId,
      limit: 1,
      sortBy: "last_message_date",
      sort: "desc",
    });

    if (conversations.conversations.length === 0) {
      console.log("No conversations found for contact, using fallback message");
      return DEFAULT_RE_ENGAGEMENT_MESSAGE;
    }

    // Get recent messages from the most recent conversation
    const recentConversation = conversations.conversations[0];
    const messages = await ghlClient.messaging.getMessages(
      recentConversation.id,
      10,
      0
    );

    if (!messages || messages.length === 0) {
      console.log("No messages found in conversation, using fallback message");
      return DEFAULT_RE_ENGAGEMENT_MESSAGE;
    }

    // Convert messages to AI format
    const aiMessages: CoreMessage[] = [];
    console.log("Messages:", messages);
    // Add recent messages as context (limit to last 5 to avoid token limits)
    const recentMessages = messages
      .slice(-MAX_MESSAGE_CONTEXT_LENGTH)
      .filter((msg: { body?: string }) => msg.body && msg.body.trim())
      .map((msg: { direction: string; body: string }) => ({
        role:
          msg.direction === "inbound"
            ? ("user" as const)
            : ("assistant" as const),
        content: msg.body || "",
      }));

    if (recentMessages.length > 0) {
      aiMessages.push(...recentMessages);
    }

    // Add a final user message to prompt the AI with system context
    const defaultPrompt = `Based on our conversation history, generate a re-engagement message for a customer who was tagged with "${triggerTag}". The message should be:
- Friendly and understanding
- Reference the situation naturally
- Offer appropriate help or next steps
- Keep it concise (1-2 sentences)
- Match the tone of our previous conversation

Generate the re-engagement message now:`;

    const promptToUse =
      customPrompt && customPrompt.trim()
        ? `${customPrompt}\n\nBased on our conversation history and the above instructions, generate an appropriate re-engagement message for a customer who was tagged with "${triggerTag}".`
        : defaultPrompt;

    aiMessages.push({
      role: "user" as const,
      content: promptToUse,
    });

    // Process through AI
    const result = await processChatRequest({
      messages: aiMessages,
      modelId: bot.defaultModelId || "gpt-4o",
      botId: bot.id,
      userId: bot.userId,
      organizationId: bot.organizationId,
      source: "webhook",
      useStreaming: false,
    });

    if (result.text && result.text.trim()) {
      console.log("Generated AI re-engagement message:", result.text);
      return result.text.trim();
    }

    // Fallback if AI didn't generate a proper response
    console.log("AI did not generate a valid message, using fallback");
    return DEFAULT_RE_ENGAGEMENT_MESSAGE;
  } catch (error) {
    console.error("Error generating AI re-engagement message:", error);
    // Always fallback to a safe message if anything goes wrong
    return DEFAULT_RE_ENGAGEMENT_MESSAGE;
  }
}

/**
 * Handle ContactTagUpdate webhook events
 */
async function handleContactTagUpdate(
  body: GoHighLevelContactTagUpdatePayload
) {
  try {
    const { locationId, id, tags } = body;

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

    const deployment = integration.deployments[0];
    if (!deployment) {
      console.log("No deployment found for integration");
      return NextResponse.json({ success: true });
    }

    const config = deployment.config as unknown as GoHighLevelDeploymentConfig;
    const followUpSituations = config.globalSettings?.followUpSituations || [];

    if (followUpSituations.length === 0) {
      console.log("No follow-up situations configured for this deployment");
      return NextResponse.json({ success: true });
    }

    const schedulerService = getSchedulerService();

    // Process each follow-up situation
    for (const situation of followUpSituations) {
      if (!situation.enabled) continue;

      const hasTag = tags.includes(situation.tag);

      // Check if contact currently has a scheduled follow-up for this specific situation
      const existingSchedules = await schedulerService.listSchedules(
        id,
        "gohighlevel"
      );
      const hasExistingSchedule = existingSchedules.some(
        (schedule) =>
          schedule.metadata?.triggerType === "follow_up" &&
          schedule.metadata?.situationId === situation.id
      );

      if (hasTag && !hasExistingSchedule) {
        // Contact tagged with this situation's tag, schedule follow-up
        let message = "";

        if (situation.messageType === "manual" && situation.manualMessage) {
          message = situation.manualMessage;
        } else {
          // Generate AI message using custom prompt if provided
          const tokenContext: TokenContext = {
            userId: integration.userId,
            provider: "gohighlevel",
            credentialId: integration.credential.id,
          };

          message = await generateReEngagementMessage(
            id,
            locationId,
            tokenContext,
            {
              id: integration.bot.id,
              defaultModelId: integration.bot.defaultModelId,
              userId: integration.bot.userId,
              organizationId: integration.bot.organizationId,
            },
            situation.tag,
            situation.customPrompt
          );
        }

        await schedulerService.scheduleTask({
          taskId: "re-engage-follow-up",
          delay: situation.timeLimit,
          payload: {
            contactId: id,
            locationId,
            deploymentId: deployment.id,
            message,
            situationId: situation.id,
            situationTag: situation.tag,
          },
          metadata: {
            contactId: id,
            locationId,
            provider: "gohighlevel",
            triggerType: "follow_up" as const,
            situationId: situation.id,
          },
        });

        console.log(
          "Scheduled follow-up task for contact",
          id,
          "situation",
          situation.name
        );
      } else if (!hasTag && hasExistingSchedule) {
        // Contact no longer has this situation's tag, cancel scheduled follow-up
        await schedulerService.cancelSchedule({
          contactId: id,
          provider: "gohighlevel",
          triggerType: "follow_up",
        });

        console.log(
          "Cancelled follow-up task for contact",
          id,
          "situation",
          situation.name
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error handling ContactTagUpdate:", error);
    return NextResponse.json(
      { error: "Failed to process ContactTagUpdate" },
      { status: 500 }
    );
  }
}

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

    // Handle different event types
    if (body.type === "ContactTagUpdate") {
      return await handleContactTagUpdate(
        body as unknown as GoHighLevelContactTagUpdatePayload
      );
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

      // Check for access code if configured
      if (config.globalSettings?.accessCode) {
        const accessCode = config.globalSettings.accessCode.trim();
        const messageContent = String(body.messageBody || body.body || "");

        // If access code is configured but not found in message, skip processing
        if (!messageContent.includes(accessCode)) {
          console.log(
            `Access code "${accessCode}" not found in message, skipping processing`
          );
          return NextResponse.json({ success: true });
        }
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
