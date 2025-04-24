import { openai } from "@ai-sdk/openai";
import type { GenericMessageEvent, WebClient } from "@slack/web-api";
import { generateText } from "ai";

// Maximum number of messages to include in the conversation history
// TODO: Connect this to the database configuration in the future
const maxMessagesToProcess = 5;

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

  const threadHistory = await client.conversations.replies({
    channel: event.channel,
    ts: event.thread_ts || event.ts,
    limit: maxMessagesToProcess + 1, // Adding 1 to account for the thread starter message
    inclusive: true,
  });

  const messagesHistory = threadHistory.messages
    ?.map((msg) => ({
      role: msg.bot_id ? ("assistant" as const) : ("user" as const),
      content: msg.text || "",
    }))
    .reverse()
    .slice(0, maxMessagesToProcess); // Take only the configured number of messages

  if (!messagesHistory || messagesHistory.length === 0) {
    console.warn("No messages found in the thread");
  }

  // Use options.userId and options.organizationId for potential future use cases
  // such as personalization or tracking
  console.log(
    `Processing message for user: ${options.userId} in organization: ${options.organizationId}`
  );

  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    system:
      "You are a helpful assistant that can answer questions and help with tasks. You are currently deployed in Slack.",
    messages: [
      ...(messagesHistory ?? []),
      {
        role: "user" as const,
        content: event.text || "",
      },
    ],
  });

  if (text) {
    // Send the message to the thread
    await client.chat.postMessage({
      channel: event.channel,
      thread_ts: event.thread_ts || event.ts,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: text,
          },
        },
      ],
    });
  } else {
    // If no previous message found, post the new message
    await client.chat.postMessage({
      channel: event.channel,
      thread_ts: event.thread_ts || event.ts,
      text: "Sorry I couldn't find an answer to that question",
    });

    try {
      await client.assistant.threads.setStatus({
        channel_id: event.channel,
        thread_ts: event.thread_ts || event.ts,
        status: "",
      });
    } catch (error) {
      console.warn("Could not clear thread status:", error);
    }
  }
}
