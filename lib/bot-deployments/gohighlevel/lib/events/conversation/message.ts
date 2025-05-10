import prisma from "@/lib/db/prisma";
import { $Enums } from "@/lib/generated/prisma";
import {
  GoHighLevelWebhookPayload,
  GoHighLevelMessageType,
  GoHighLevelDeploymentConfig,
} from "../../../types";
import {
  generateGHLConversationUUID,
  checkContactHasKillSwitchWithAuthClient,
} from "../../../lib/helpers";
import { processDeploymentMessage } from "../../../../processor";
import { DeploymentPlatform } from "../../../../types";
import { CoreMessage } from "ai";
import { TokenContext } from "@/lib/auth/types";
import { GoHighLevelClient } from "@/lib/auth/clients/gohighlevel";
import { createClient } from "@/lib/auth/provider-registry";

interface AssistantContext {
  userId: string;
  organizationId: string;
  botId: string;
}

/**
 * Process an incoming message from GoHighLevel and generate a response using the AI
 */
export async function assistantConversationMessage(
  webhookPayload: GoHighLevelWebhookPayload,
  tokenContext: TokenContext,
  context: AssistantContext
) {
  try {
    console.log("Processing GoHighLevel message", {
      conversationId: webhookPayload.conversationId,
      messageType: webhookPayload.messageType,
    });

    // Skip if this isn't an inbound message
    if (webhookPayload.direction !== "inbound") {
      console.log("Ignoring non-inbound message");
      return;
    }

    const { botId, userId, organizationId } = context;
    const { body, contactId, conversationId, messageType, locationId } =
      webhookPayload;

    // Check if this conversation is opted out by checking the bot's internal database
    const conversationOptOut = await prisma.deployment.findFirst({
      where: {
        botId,
        type: $Enums.DeploymentType.GOHIGHLEVEL,
        config: {
          path: ["optedOutConversations"],
          array_contains: conversationId,
        },
      },
    });

    if (conversationOptOut) {
      console.log("Conversation opted out, not responding");
      return;
    }

    // Create the GoHighLevel client using the auth module
    const ghlClient = await createClient<GoHighLevelClient>(tokenContext);
    const contactsClient = ghlClient.contacts;

    // Check if the contact has the kill_switch tag
    const hasKillSwitch = await checkContactHasKillSwitchWithAuthClient(
      contactsClient,
      contactId
    );

    if (hasKillSwitch) {
      console.log("Contact has kill_switch tag, not responding");
      return;
    }

    // Check if the deployment is configured for this message type
    const deployment = await prisma.deployment.findFirst({
      where: {
        botId,
        type: $Enums.DeploymentType.GOHIGHLEVEL,
        config: {
          path: ["locationId"],
          equals: locationId,
        },
      },
    });

    if (!deployment) {
      console.log("No deployment found for this location");
      return;
    }

    // Check if this message type is enabled
    const config = deployment.config as unknown as GoHighLevelDeploymentConfig;
    const channels = config.channels || [];
    const isEnabled = channels.some(
      (ch) => ch.type === messageType && ch.active === true
    );

    if (!isEnabled) {
      console.log(`Message type ${messageType} is not enabled`);
      return;
    }

    // Get the bot
    const bot = await prisma.bot.findUnique({
      where: { id: botId },
    });

    if (!bot) {
      console.error("Bot not found");
      return;
    }

    const generatedConversationId = generateGHLConversationUUID(
      contactId,
      locationId
    );

    // Create or get conversation in our system
    const conversation = await prisma.conversation.upsert({
      where: {
        id: generatedConversationId,
      },
      update: {
        status: $Enums.ConversationStatus.ACTIVE,
      },
      create: {
        id: generatedConversationId,
        botId,
        externalUserId: contactId,
        source: "gohighlevel",
        status: $Enums.ConversationStatus.ACTIVE,
        metadata: {
          locationId,
          messageType,
        },
      },
    });

    // Fetch the latest 10 messages for context (oldest to newest).
    const history = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { timestamp: "desc" },
      take: 10,
    });

    const messages: CoreMessage[] = [];
    for (const msg of history.reverse()) {
      const role =
        msg.role === $Enums.MessageRole.ASSISTANT
          ? "assistant"
          : msg.role === $Enums.MessageRole.USER
          ? "user"
          : "system";
      if (role === "user") {
        messages.push({ role, content: msg.content });
      } else if (role === "assistant") {
        let arr: unknown[] = [];
        if (Array.isArray(msg.responseMessages)) {
          arr = msg.responseMessages;
        } else if (typeof msg.responseMessages === "string") {
          try {
            arr = JSON.parse(msg.responseMessages);
          } catch {}
        }
        if (arr.length > 0) {
          for (const item of arr) {
            if (
              item &&
              typeof item === "object" &&
              typeof (item as CoreMessage).role === "string"
            ) {
              messages.push(item as CoreMessage);
            }
          }
        } else {
          messages.push({ role, content: msg.content });
        }
      }
      // Ignore system messages for now
    }

    messages.push({
      role: "user",
      content: body,
    });

    // Get the messaging client from the auth module
    const messagingClient = ghlClient.messaging;

    // Create the GoHighLevel platform adapter
    const goHighLevelPlatform: DeploymentPlatform = {
      type: "gohighlevel",
      supportsStreaming: false,
      sendMessage: async (content: string) => {
        await messagingClient.sendMessage({
          type: webhookPayload.messageType as GoHighLevelMessageType,
          contactId: webhookPayload.contactId,
          message: content,
          conversationId: webhookPayload.conversationId,
          locationId,
        });
      },
      setStatus: async () => {
        // No-op for now; GoHighLevel does not support status updates
      },
    };

    // Process the message through the common processor
    await processDeploymentMessage({
      botId,
      userId,
      organizationId,
      source: "gohighlevel",
      deploymentType: "GOHIGHLEVEL",
      messages: messages as CoreMessage[],
      platform: goHighLevelPlatform,
      conversationId: conversation.id,
      webhookPayload: webhookPayload as unknown as Record<string, unknown>,
    });

    console.log("Successfully processed GoHighLevel message");
  } catch (error) {
    console.error("Error processing GoHighLevel message:", error);
  }
}
