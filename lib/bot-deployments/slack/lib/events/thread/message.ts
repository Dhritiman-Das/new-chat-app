import type { GenericMessageEvent, WebClient } from "@slack/web-api";
import { processDeploymentMessage } from "../../../../processor";
import { DeploymentPlatform } from "../../../../types";
import type { CoreMessage } from "ai";
import prisma from "@/lib/db/prisma";
import { $Enums } from "@/lib/generated/prisma";
import { generateSlackThreadUUID } from "../../helpers";
import { SlackClient } from "@/lib/auth/clients/slack";

// Define a more specific type for our message events
interface SlackMessageEvent extends GenericMessageEvent {
  channel: string;
  ts: string;
  thread_ts?: string;
  text?: string;
}

export async function assistantThreadMessage(
  event: SlackMessageEvent,
  client: WebClient | SlackClient,
  options: {
    userId: string;
    organizationId: string;
    botId: string;
  }
) {
  // Get the webclient regardless of the client type
  const webClient: WebClient =
    client instanceof SlackClient
      ? client.client || (await client.getWebClient())
      : client;

  // Update the status of the thread
  try {
    await webClient.assistant.threads.setStatus({
      channel_id: event.channel,
      thread_ts: event.thread_ts || event.ts,
      status: "Is thinking...",
    });
  } catch (error) {
    console.warn("Could not set thread status:", error);
  }

  // Create or get conversation in our system (upsert)
  const conversation = await prisma.conversation.upsert({
    where: {
      id: generateSlackThreadUUID(event.channel, event.thread_ts || event.ts),
    },
    update: {
      status: $Enums.ConversationStatus.ACTIVE,
    }, // Optionally update status or metadata if needed
    create: {
      id: generateSlackThreadUUID(event.channel, event.thread_ts || event.ts),
      botId: options.botId,
      externalUserId: event.user,
      source: "slack",
      status: $Enums.ConversationStatus.ACTIVE,
      metadata: {
        channel: event.channel,
      },
    },
  });

  // Fetch the latest 10 messages for context (oldest to newest)
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
    content: event.text || "",
  });

  // Create the Slack platform adapter
  const slackPlatform: DeploymentPlatform = {
    type: "slack",
    supportsStreaming: false,
    sendMessage: async (content: string) => {
      // Send the message to the thread
      await webClient.chat.postMessage({
        channel: event.channel,
        thread_ts: event.thread_ts || event.ts,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: content,
            },
          },
        ],
      });
    },
    setStatus: async (status: string = "") => {
      try {
        await webClient.assistant.threads.setStatus({
          channel_id: event.channel,
          thread_ts: event.thread_ts || event.ts,
          status,
        });
      } catch (error) {
        console.warn("Could not update thread status:", error);
      }
    },
  };

  try {
    // Process the message through the common processor
    await processDeploymentMessage({
      botId: options.botId,
      userId: options.userId,
      organizationId: options.organizationId,
      source: "slack",
      deploymentType: "SLACK",
      messages,
      platform: slackPlatform,
      conversationId: conversation.id,
    });
  } catch (error) {
    console.error("Error processing Slack message:", error);

    // Send error message to thread
    await webClient.chat.postMessage({
      channel: event.channel,
      thread_ts: event.thread_ts || event.ts,
      text: "Sorry, I encountered an error processing your request.",
    });

    // Clear status
    try {
      await webClient.assistant.threads.setStatus({
        channel_id: event.channel,
        thread_ts: event.thread_ts || event.ts,
        status: "",
      });
    } catch (statusError) {
      console.warn("Could not clear thread status:", statusError);
    }
  }
}
