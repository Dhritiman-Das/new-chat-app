export interface SlackConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  signingSecret: string;
  stateSecret: string;
  appId: string;
}

export const slackConfig: SlackConfig = {
  clientId: process.env.NEXT_PUBLIC_SLACK_CLIENT_ID || "",
  clientSecret: process.env.SLACK_CLIENT_SECRET || "",
  redirectUri: process.env.NEXT_PUBLIC_SLACK_OAUTH_REDIRECT_URL || "",
  signingSecret: process.env.SLACK_SIGNING_SECRET || "",
  stateSecret: process.env.SLACK_STATE_SECRET || "",
  appId: process.env.NEXT_PUBLIC_SLACK_APP_ID || "",
};
