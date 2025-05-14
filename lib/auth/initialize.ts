/**
 * Auth module initialization
 *
 * This module handles initialization of providers during application startup.
 * It pre-registers commonly used providers to avoid dynamic imports on first access.
 */

import { registerProvider } from "./provider-registry";
import { GoHighLevelProvider } from "./providers/gohighlevel";
import { GoogleProvider } from "./providers/google";
import { SlackProvider } from "./providers/slack";

/**
 * Initialize the auth module by registering common providers
 */
export function initializeAuth(): void {
  // Register common providers
  registerProvider("gohighlevel", new GoHighLevelProvider());
  registerProvider("google", new GoogleProvider());
  registerProvider("slack", new SlackProvider());

  console.log("Auth module initialized with common providers");
}

// Auto-initialize when imported
initializeAuth();
