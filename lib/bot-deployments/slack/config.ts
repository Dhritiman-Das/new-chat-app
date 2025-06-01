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
