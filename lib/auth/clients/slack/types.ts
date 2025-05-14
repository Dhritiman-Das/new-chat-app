import { TokenContext } from "../../types";

export interface SlackClientOptions {
  userId: string;
  credentialId?: string;
  botId?: string;
}

export interface SlackClientConfig {
  context: TokenContext;
}
