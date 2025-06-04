/**
 * OAuth provider configurations
 */
import { env } from "@/src/env";

// GoHighLevel configuration
export const gohighlevelConfig = {
  apiEndpoint: "https://services.leadconnectorhq.com",
  clientId: env.NEXT_PUBLIC_GOHIGHLEVEL_CLIENT_ID,
  clientSecret: env.GOHIGHLEVEL_CLIENT_SECRET,
  apiVersion: "2021-04-15",
  authEndpoint: "https://marketplace.gohighlevel.com/oauth/chooselocation",
  tokenEndpoint: "https://services.leadconnectorhq.com/oauth/token",
  redirectUri: env.NEXT_PUBLIC_GOHIGHLEVEL_OAUTH_REDIRECT_URL,
  scopes: [
    "calendars.readonly",
    "calendars.write",
    "calendars/events.readonly",
    "calendars/events.write",
    "calendars/groups.readonly",
    "conversations.readonly",
    "conversations.write",
    "conversations/message.readonly",
    "conversations/message.write",
    "conversations/livechat.write",
    "conversations/reports.readonly",
    "contacts.readonly",
    "contacts.write",
    "locations.readonly",
  ],
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

// Google configuration
export const googleConfig = {
  apiEndpoint: "https://www.googleapis.com",
  clientId: env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  clientSecret: env.GOOGLE_CLIENT_SECRET,
  authEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
  redirectUri: `${env.NEXT_PUBLIC_APP_URL}/api/auth/callback/google`,
  calendarScopes: [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/calendar.readonly",
  ],
};

// Slack configuration
export const slackConfig = {
  clientId: env.NEXT_PUBLIC_SLACK_CLIENT_ID,
  clientSecret: env.SLACK_CLIENT_SECRET,
  redirectUri: env.NEXT_PUBLIC_SLACK_OAUTH_REDIRECT_URL,
  signingSecret: env.SLACK_SIGNING_SECRET,
  stateSecret: env.SLACK_STATE_SECRET,
  appId: env.NEXT_PUBLIC_SLACK_APP_ID,
  authEndpoint: "https://slack.com/oauth/v2/authorize",
  tokenEndpoint: "https://slack.com/api/oauth.v2.access",
  scopes: [
    "chat:write",
    "channels:read",
    "incoming-webhook",
    "users:read",
    "assistant:write",
  ],
};

// Provider-specific authentication URLs
export function getAuthUrl(provider: string, state: string): string {
  switch (provider) {
    case "gohighlevel": {
      const url = new URL(gohighlevelConfig.authEndpoint);
      url.searchParams.append("response_type", "code");
      url.searchParams.append("redirect_uri", gohighlevelConfig.redirectUri);
      url.searchParams.append("client_id", gohighlevelConfig.clientId);
      url.searchParams.append("scope", gohighlevelConfig.scopes.join(" "));
      url.searchParams.append("state", state);
      return url.toString();
    }
    case "google": {
      const url = new URL(googleConfig.authEndpoint);
      url.searchParams.append("client_id", googleConfig.clientId);
      url.searchParams.append("redirect_uri", googleConfig.redirectUri);
      url.searchParams.append("response_type", "code");
      url.searchParams.append("scope", googleConfig.calendarScopes.join(" "));
      url.searchParams.append("access_type", "offline");
      url.searchParams.append("prompt", "consent"); // Always prompt for consent to get a refresh token
      url.searchParams.append("state", state);
      return url.toString();
    }
    case "slack": {
      const url = new URL(slackConfig.authEndpoint);
      url.searchParams.append("client_id", slackConfig.clientId);
      url.searchParams.append("redirect_uri", slackConfig.redirectUri);
      url.searchParams.append("response_type", "code");
      url.searchParams.append("scope", slackConfig.scopes.join(" "));
      url.searchParams.append("state", state);
      return url.toString();
    }
    default:
      throw new Error(`Provider ${provider} not supported`);
  }
}
