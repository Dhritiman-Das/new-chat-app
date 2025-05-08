import { waitUntil } from "@vercel/functions";
import { SlackEvent } from "@slack/web-api";
import { createSlackWebClient } from "../client";
import { assistantThreadStarted } from "./thread/started";
import { assistantThreadMessage } from "./thread/message";

export async function handleSlackEvent(
  event: SlackEvent,
  options: { token: string; teamId: string }
) {
  const client = createSlackWebClient({
    token: options.token,
  });

  if (event.type === "assistant_thread_started") {
    waitUntil(assistantThreadStarted(event, client));
    return;
  }

  // In Assisant Threads

  if (
    event.type &&
    event.type === "message" &&
    event.channel_type === "im" &&
    // @ts-expect-error - bot_id may exist on some message event types
    !event.bot_id && // Ignore bot messages
    // @ts-expect-error - subtype may not be in the type definition but exists at runtime
    event.subtype !== "assistant_app_thread"
  ) {
    // @ts-expect-error - We know this is a valid message event in this context
    waitUntil(assistantThreadMessage(event, client, options));
    return;
  }
}

export * from "./thread";
