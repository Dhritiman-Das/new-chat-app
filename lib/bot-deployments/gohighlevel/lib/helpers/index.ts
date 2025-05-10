export * from "./generate-ghl-conversation-uuid";
export * from "./contacts";

// Re-export specific helper functions
export { generateGHLConversationUUID } from "./generate-ghl-conversation-uuid";

// Use imports from auth module
export { createGoHighLevelClient } from "@/lib/auth/clients/gohighlevel";
export { verifyWebhookSignature } from "@/lib/auth/services/webhook-verification";

// Re-export the contact functions that use the auth module
export { checkContactHasKillSwitchWithAuthClient as checkContactHasKillSwitch } from "./contacts";
