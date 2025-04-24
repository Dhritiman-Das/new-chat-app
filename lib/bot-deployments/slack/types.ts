import { WebClient } from "@slack/web-api";

export interface SlackMessageOptions {
  channelId: string;
  threadTs: string;
  client: WebClient;
}

export interface SlackMessage {
  text: string;
  channelId: string;
  threadTs: string;
  blocks?: Array<{
    type: string;
    text?: {
      type: string;
      text: string;
    };
    [key: string]: unknown;
  }>;
}
