/**
 * Cache tag constants to ensure consistent tag naming across the application
 */

// User related cache tags
export const USER = (userId: string) => `user:${userId}`;
export const USER_ORGS = (userId: string) => `user:${userId}:organizations`;
export const USER_BOTS = (userId: string) => `user:${userId}:bots`;
export const USER_BOTS_GROUPED = (userId: string) =>
  `user:${userId}:bots:grouped`;
export const USER_CONVERSATIONS = (userId: string) =>
  `user:${userId}:conversations`;
export const USER_KNOWLEDGE_BASES = (userId: string) =>
  `user:${userId}:knowledge-bases`;
export const USER_INTEGRATIONS = (userId: string) =>
  `user:${userId}:integrations`;

// Organization related cache tags
export const ORGANIZATION = (orgId: string) => `organization:${orgId}`;
export const ORGANIZATION_BOTS = (orgId: string) =>
  `organization:${orgId}:bots`;
export const ORGANIZATION_INVOICES = (orgId: string) =>
  `organization:${orgId}:invoices`;
export const ORGANIZATION_SLUGS = "organization:slugs";

// Bot related cache tags
export const BOT = (botId: string) => `bot:${botId}`;
export const BOT_TOOLS = (botId: string) => `bot:${botId}:tools`;
export const BOT_KNOWLEDGE_BASES = (botId: string) =>
  `bot:${botId}:knowledge-bases`;
export const BOT_DEPLOYMENTS = (botId: string) => `bot:${botId}:deployments`;
export const BOT_CONVERSATIONS = (botId: string) =>
  `bot:${botId}:conversations`;
export const BOT_CONVERSATION_SOURCES = (botId: string) =>
  `bot:${botId}:conversation:sources`;
export const BOT_CONVERSATION_STATUS = (botId: string) =>
  `bot:${botId}:conversation:status`;
export const BOT_APPOINTMENTS = (botId: string) => `bot:${botId}:appointments`;
export const BOT_INTEGRATIONS = (botId: string) => `bot:${botId}:integrations`;
export const BOT_COUNTS = (botId: string) => `bot:${botId}:counts`;
export const BOT_ALL_TOOLS = (botId: string) => `bot:${botId}:all-tools`;

// Conversation related cache tags
export const CONVERSATION = (conversationId: string) =>
  `conversation:${conversationId}`;

// Knowledge base related cache tags
export const KNOWLEDGE_BASE = (knowledgeBaseId: string) =>
  `knowledge-base:${knowledgeBaseId}`;

// Template related cache tags
export const TEMPLATES = "templates";
export const TEMPLATE_CATEGORIES = "template:categories";

// Add-on related cache tags
export const ADD_ONS = "add-ons";
export const MESSAGE_CREDITS = "add-ons:message-credits";
export const AGENT_ADD_ONS = "add-ons:agents";
