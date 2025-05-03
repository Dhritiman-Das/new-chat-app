import image from "./assets/image.png";
import { onInitialize } from "./initialize";

export interface GoHighLevelConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  apiVersion: string;
  apiEndpoint: string;
  publicKey: string;
}

export const gohighlevelConfig: GoHighLevelConfig = {
  clientId: process.env.NEXT_PUBLIC_GOHIGHLEVEL_CLIENT_ID || "",
  clientSecret: process.env.GOHIGHLEVEL_CLIENT_SECRET || "",
  redirectUri: process.env.NEXT_PUBLIC_GOHIGHLEVEL_OAUTH_REDIRECT_URL || "",
  apiVersion: "2021-04-15",
  apiEndpoint: "https://services.leadconnectorhq.com",
  publicKey: `-----BEGIN PUBLIC KEY-----
MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAokvo/r9tVgcfZ5DysOSC
Frm602qYV0MaAiNnX9O8KxMbiyRKWeL9JpCpVpt4XHIcBOK4u3cLSqJGOLaPuXw6
dO0t6Q/ZVdAV5Phz+ZtzPL16iCGeK9po6D6JHBpbi989mmzMryUnQJezlYJ3DVfB
csedpinheNnyYeFXolrJvcsjDtfAeRx5ByHQmTnSdFUzuAnC9/GepgLT9SM4nCpv
uxmZMxrJt5Rw+VUaQ9B8JSvbMPpez4peKaJPZHBbU3OdeCVx5klVXXZQGNHOs8gF
3kvoV5rTnXV0IknLBXlcKKAQLZcY/Q9rG6Ifi9c+5vqlvHPCUJFT5XUGG5RKgOKU
J062fRtN+rLYZUV+BjafxQauvC8wSWeYja63VSUruvmNj8xkx2zE/Juc+yjLjTXp
IocmaiFeAO6fUtNjDeFVkhf5LNb59vECyrHD2SQIrhgXpO4Q3dVNA5rw576PwTzN
h/AMfHKIjE4xQA1SZuYJmNnmVZLIZBlQAF9Ntd03rfadZ+yDiOXCCs9FkHibELhC
HULgCsnuDJHcrGNd5/Ddm5hxGQ0ASitgHeMZ0kcIOwKDOzOU53lDza6/Y09T7sYJ
PQe7z0cvj7aE4B+Ax1ZoZGPzpJlZtGXCsu9aTEGEnKzmsFqwcSsnw3JB31IGKAyk
T1hhTiaCeIY/OwwwNUY2yvcCAwEAAQ==
-----END PUBLIC KEY-----`,
};

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
  images: [image],
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
