import { createTokenContext } from "../../index";
import { SlackClient } from "./client";
import type { SlackClientOptions } from "./types";

/**
 * Create a Slack client
 */
export async function createSlackClient(
  options: SlackClientOptions
): Promise<SlackClient> {
  const context = createTokenContext(options.userId, "slack", {
    credentialId: options.credentialId,
    botId: options.botId,
  });

  const slackClient = new SlackClient(context);
  await slackClient.init();
  return slackClient;
}
