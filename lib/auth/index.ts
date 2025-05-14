/**
 * Auth module entry point
 *
 * This module provides a unified interface for authentication and OAuth operations.
 */

// Initialize the auth module (registers common providers)
import "./initialize";

// Re-export error classes
export * from "./errors";

// Re-export common types
export * from "./types";

// Re-export registry functions
export {
  getProvider,
  getToken,
  createClient,
  registerProvider,
} from "./provider-registry";

// Export provider classes
export { GoHighLevelProvider } from "./providers/gohighlevel";
export { GoogleProvider } from "./providers/google";
export { SlackProvider } from "./providers/slack";

// Export credential utilities
export { getCredentials, updateCredentials } from "./utils/store";

// Export token utilities
export { validateToken, needsRefresh } from "./utils/validate";

// Export token refresh utilities
export { refreshToken } from "./utils/refresh";

// Export client factories
export {
  createClient as createRawClient,
  createServiceClient,
} from "./clients";

// Export client types
export type { GoHighLevelClient } from "./clients";
export type { GoHighLevelCalendarClient } from "./clients";
export type { GoHighLevelMessagingClient } from "./clients";
export type { GoHighLevelContactsClient } from "./clients";

// Re-export functions
export { createGoHighLevelClient } from "./clients";

// Export provider configuration utilities
export {
  getAuthUrl,
  gohighlevelConfig,
  googleConfig,
  slackConfig,
} from "./config/providers-config";

// Export initialization function
export { initializeAuth } from "./initialize";

// Convenience function to create a token context
export function createTokenContext(
  userId: string,
  provider: string,
  options?: { credentialId?: string; botId?: string }
) {
  return {
    userId,
    provider,
    credentialId: options?.credentialId,
    botId: options?.botId,
  };
}

// Re-export services
export * from "./services";
