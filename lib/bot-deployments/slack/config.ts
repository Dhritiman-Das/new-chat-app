import image from "./assets/image.png";
import { onInitialize } from "./initialize";

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

export default {
  name: "Slack",
  id: "slack",
  category: "Assistant",
  active: true,
  destination: "/slack",
  deploymentType: "SLACK",
  short_description:
    "Seamlessly connect your workflows with Slack's messaging platform for real-time team collaboration and notifications.",
  description:
    "Integrating with Slack allows direct interaction with the app through channels and DMs, enabling automated alerts, data sharing, and collaborative workflows. This enhances cross-team coordination and keeps stakeholders informed through centralized communication.",
  images: [image],
  settings: [], // Ignore this for now
  onInitialize,
};
