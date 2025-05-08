import { AxiosInstance } from "axios";
import prisma from "@/lib/db/prisma";
import { $Enums } from "@/lib/generated/prisma";
import {
  GoHighLevelWebhookPayload,
  GoHighLevelMessage,
  GoHighLevelMessageType,
  GoHighLevelDeploymentConfig,
} from "../../../types";
import {
  checkContactHasKillSwitch,
  generateGHLConversationUUID,
} from "../../../index";
import { processDeploymentMessage } from "../../../../processor";
import { DeploymentPlatform } from "../../../../types";
import { CoreMessage } from "ai";

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
  client: AxiosInstance,
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

    // Check if the contact has the kill_switch tag
    const hasKillSwitch = await checkContactHasKillSwitch(
      Promise.resolve(client),
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

    // Create or get conversation in our system
    const conversation = await prisma.conversation.upsert({
      where: {
        id: generateGHLConversationUUID(contactId, locationId),
      },
      update: {
        status: $Enums.ConversationStatus.ACTIVE,
      },
      create: {
        id: conversationId,
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

    // Create the GoHighLevel platform adapter
    const goHighLevelPlatform: DeploymentPlatform = {
      type: "gohighlevel",
      supportsStreaming: false,
      sendMessage: async (content: string) => {
        await sendGoHighLevelResponse(client, {
          type: webhookPayload.messageType as GoHighLevelMessageType,
          contactId: webhookPayload.contactId,
          message: content,
          conversationId: webhookPayload.conversationId,
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
    });

    console.log("Successfully processed GoHighLevel message");
  } catch (error) {
    console.error("Error processing GoHighLevel message:", error);
  }
}

// Send response back to GoHighLevel
async function sendGoHighLevelResponse(
  client: AxiosInstance,
  message: GoHighLevelMessage
) {
  try {
    const response = await client.post("/conversations/messages", message);
    return response.data;
  } catch (error) {
    console.error("Error sending GoHighLevel response:", error);
    throw error;
  }
}
