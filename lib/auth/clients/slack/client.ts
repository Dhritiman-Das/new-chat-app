import { App } from "@slack/bolt";
import { WebClient } from "@slack/web-api";
import { getToken, getProvider } from "../../index";
import { SlackCredentials } from "../../types";
import { SlackClientConfig } from "./types";
import prisma from "@/lib/db/prisma";

export class SlackClient {
  private app: App | null = null;
  private context: SlackClientConfig["context"];
  public client: WebClient | null = null;

  constructor(context: SlackClientConfig["context"]) {
    this.context = context;
  }

  /**
   * Initialize the Slack client
   */
  async init() {
    if (this.app) return this.app;

    try {
      const token = await getToken(this.context);
      const provider = await getProvider<SlackCredentials>("slack");
      const credentials = await prisma.credential.findUnique({
        where: { id: this.context.credentialId },
      });

      if (!credentials) {
        throw new Error("Slack credentials not found");
      }

      this.app = (await provider.createClient({
        access_token: token,
        ...(credentials.credentials as Omit<SlackCredentials, "access_token">),
      })) as App;

      // Store the WebClient reference for direct access
      this.client = this.app.client;

      return this.app;
    } catch (error) {
      console.error("Error initializing Slack client:", error);
      throw error;
    }
  }

  /**
   * Get the Slack app instance
   */
  async getApp() {
    if (!this.app) {
      await this.init();
    }
    return this.app!;
  }

  /**
   * Get the Slack WebClient instance
   */
  async getWebClient(): Promise<WebClient> {
    if (!this.client) {
      await this.init();
    }
    return this.client!;
  }

  /**
   * Send a message to a channel
   */
  async sendMessage(channelId: string, message: string) {
    const app = await this.getApp();
    try {
      const result = await app.client.chat.postMessage({
        channel: channelId,
        text: message,
      });
      return result;
    } catch (error) {
      console.error("Error sending Slack message:", error);
      throw error;
    }
  }

  /**
   * Get a list of channels
   */
  async getChannels() {
    const app = await this.getApp();
    try {
      const result = await app.client.conversations.list();
      return result.channels || [];
    } catch (error) {
      console.error("Error getting Slack channels:", error);
      throw error;
    }
  }
}
