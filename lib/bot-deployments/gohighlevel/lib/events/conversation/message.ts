import { AxiosInstance } from "axios";
import prisma from "@/lib/db/prisma";
import { $Enums } from "@/lib/generated/prisma";
import {
  GoHighLevelWebhookPayload,
  GoHighLevelMessage,
  GoHighLevelMessageType,
  GoHighLevelDeploymentConfig,
} from "../../../types";
import { checkContactHasKillSwitch } from "../../../index";

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

    const { botId } = context;
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
      contactId,
      locationId
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
        id: conversationId,
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

    // Create a message in our system
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: $Enums.MessageRole.USER,
        content: body,
      },
    });

    // Get AI response
    // TODO: Use your AI system to generate a response
    const aiResponse = await getAIResponse(bot, body);

    // Create a message for the AI response
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: $Enums.MessageRole.ASSISTANT,
        content: aiResponse,
      },
    });

    // Send the response back to GoHighLevel
    await sendGoHighLevelResponse(client, {
      type: webhookPayload.messageType as GoHighLevelMessageType,
      contactId: webhookPayload.contactId,
      message: aiResponse,
      conversationId: webhookPayload.conversationId,
    });

    console.log("Successfully processed GoHighLevel message");
  } catch (error) {
    console.error("Error processing GoHighLevel message:", error);
  }
}

// Temporary function - will be replaced with actual AI implementation
async function getAIResponse(
  bot: { systemPrompt: string; id: string },
  message: string
): Promise<string> {
  // This is a placeholder. In a real implementation, you'd integrate with your
  // AI service to generate a response based on the bot's system prompt
  // and the message history.
  return `[Bot ${bot.id}] This is an automated response to: "${message}"`;
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
