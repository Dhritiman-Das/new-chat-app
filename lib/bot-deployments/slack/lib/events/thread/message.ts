import type { GenericMessageEvent, WebClient } from "@slack/web-api";
import { processDeploymentMessage } from "../../../../processor";
import { ChatMessage, DeploymentPlatform } from "../../../../types";

// Define a more specific type for our message events
interface SlackMessageEvent extends GenericMessageEvent {
  channel: string;
  ts: string;
  thread_ts?: string;
  text?: string;
}

export async function assistantThreadMessage(
  event: SlackMessageEvent,
  client: WebClient,
  options: {
    userId: string;
    organizationId: string;
    botId: string;
  }
) {
  // Update the status of the thread
  try {
    await client.assistant.threads.setStatus({
      channel_id: event.channel,
      thread_ts: event.thread_ts || event.ts,
      status: "Is thinking...",
    });
  } catch (error) {
    console.warn("Could not set thread status:", error);
  }

  // Get conversation history from the thread
  const threadHistory = await client.conversations.replies({
    channel: event.channel,
    ts: event.thread_ts || event.ts,
    limit: 5, // Limiting to 5 messages for context
    inclusive: true,
  });

  if (!threadHistory.messages || threadHistory.messages.length === 0) {
    console.warn("No messages found in the thread");
    return;
  }

  // Convert Slack messages to a format the chat processor can understand
  const messages: ChatMessage[] = threadHistory.messages
    .map((msg) => ({
      role: msg.bot_id ? "assistant" : "user",
      content: msg.text || "",
    }))
    .reverse()
    .slice(0, 5); // Take only the configured number of messages

  // Create the Slack platform adapter
  const slackPlatform: DeploymentPlatform = {
    type: "slack",
    supportsStreaming: false,
    sendMessage: async (content: string) => {
      // Send the message to the thread
      await client.chat.postMessage({
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
        await client.assistant.threads.setStatus({
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
    });
  } catch (error) {
    console.error("Error processing Slack message:", error);

    // Send error message to thread
    await client.chat.postMessage({
      channel: event.channel,
      thread_ts: event.thread_ts || event.ts,
      text: "Sorry, I encountered an error processing your request.",
    });

    // Clear status
    try {
      await client.assistant.threads.setStatus({
        channel_id: event.channel,
        thread_ts: event.thread_ts || event.ts,
        status: "",
      });
    } catch (statusError) {
      console.warn("Could not clear thread status:", statusError);
    }
  }
}
