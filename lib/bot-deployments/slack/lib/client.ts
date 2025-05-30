import { LogLevel, App as SlackApp } from "@slack/bolt";
import { InstallProvider } from "@slack/oauth";
import { WebClient } from "@slack/web-api";
import { env } from "@/src/env";

const SLACK_CLIENT_ID = env.NEXT_PUBLIC_SLACK_CLIENT_ID;
const SLACK_CLIENT_SECRET = env.SLACK_CLIENT_SECRET;
const SLACK_OAUTH_REDIRECT_URL = env.NEXT_PUBLIC_SLACK_OAUTH_REDIRECT_URL;
const SLACK_STATE_SECRET = env.SLACK_STATE_SECRET;
const SLACK_SIGNING_SECRET = env.SLACK_SIGNING_SECRET;

export const slackInstaller = new InstallProvider({
  clientId: SLACK_CLIENT_ID!,
  clientSecret: SLACK_CLIENT_SECRET!,
  stateSecret: SLACK_STATE_SECRET,
  logLevel: env.NODE_ENV === "development" ? LogLevel.DEBUG : undefined,
});

export const createSlackApp = ({
  token,
  botId,
}: {
  token: string;
  botId: string;
}) => {
  return new SlackApp({
    signingSecret: SLACK_SIGNING_SECRET,
    token,
    botId,
  });
};

export const createSlackWebClient = ({ token }: { token: string }) => {
  return new WebClient(token);
};

export const getInstallUrl = ({
  teamId,
  userId,
}: {
  teamId: string;
  userId: string;
}) => {
  return slackInstaller.generateInstallUrl({
    scopes: [
      "incoming-webhook",
      "chat:write",
      "chat:write.public",
      "team:read",
      "assistant:write",
      "im:history",
      "commands",
      "files:read",
    ],
    redirectUri: SLACK_OAUTH_REDIRECT_URL,
    metadata: JSON.stringify({ teamId, userId }),
  });
};

export const downloadFile = async ({
  privateDownloadUrl,
  token,
}: {
  privateDownloadUrl: string;
  token: string;
}) => {
  const response = await fetch(privateDownloadUrl, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.arrayBuffer();
};
