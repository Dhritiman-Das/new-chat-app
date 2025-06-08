import highlevelPreview from "./assets/highlevel-preview.png";
import { onInitialize } from "./initialize";

export default {
  name: "GoHighLevel",
  id: "gohighlevel",
  category: "Assistant",
  active: true,
  destination: "/gohighlevel",
  deploymentType: "GOHIGHLEVEL",
  short_description:
    "Automate marketing, CRM, and client management by connecting with GoHighLevel's all-in-one sales & marketing platform.",
  description:
    "Integration with GoHighLevel enables unified control over marketing automation, lead nurturing, and multi-channel campaigns through its CRM, workflow builder, and reputation management tools. This bridges communication gaps between sales pipelines, customer interactions, and marketing analytics.",
  images: [highlevelPreview],
  settings: [
    {
      id: "channels",
      name: "Message Channels",
      description: "Select which channels the bot should respond to",
      type: "multiselect",
      options: [
        { value: "SMS", label: "SMS" },
        { value: "Email", label: "Email" },
        { value: "WhatsApp", label: "WhatsApp" },
        { value: "IG", label: "Instagram" },
        { value: "FB", label: "Facebook" },
        { value: "Live_Chat", label: "Live Chat" },
        { value: "CALL", label: "Voicemail" },
      ],
      required: true,
    },
    {
      id: "checkKillSwitch",
      name: "Check for kill_switch tag",
      description: "Don't respond if the contact has a kill_switch tag",
      type: "boolean",
      default: true,
    },
  ],
  onInitialize,
};
