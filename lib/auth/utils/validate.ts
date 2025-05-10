/**
 * Utilities for token validation
 */

import { TokenContext, BaseOAuthCredentials } from "../types";
import { getCredentials } from "./store";
import { TokenError } from "../errors";

/**
 * Check if OAuth credentials are valid and not expired
 */
export async function validateToken<T extends BaseOAuthCredentials>(
  context: TokenContext
): Promise<{
  isValid: boolean;
  expiresIn?: number;
  credentials?: T;
}> {
  try {
    const credentials = await getCredentials<T>(context);

    if (!credentials.access_token) {
      return { isValid: false };
    }

    // Check if there's an expiry date and it's in the future
    if (credentials.expires_at) {
      const now = Date.now();
      const expiresIn = Math.floor((credentials.expires_at - now) / 1000);

      return {
        isValid: expiresIn > 0,
        expiresIn: expiresIn > 0 ? expiresIn : 0,
        credentials,
      };
    }

    // If there's no expiry date, assume it's valid
    return { isValid: true, credentials };
  } catch (error) {
    if (error instanceof TokenError) {
      // Token errors like NOT_FOUND shouldn't break the app
      return { isValid: false };
    }

    console.error("Error validating token:", error);
    throw error;
  }
}

/**
 * Check if credentials need refresh
 */
export function needsRefresh(credentials: BaseOAuthCredentials): boolean {
  if (!credentials.expires_at) {
    return false; // No expiry means never refresh
  }

  // Add a buffer of 5 minutes to refresh before expiration
  const refreshBuffer = 5 * 60 * 1000; // 5 minutes in milliseconds
  const now = Date.now();

  return now + refreshBuffer >= credentials.expires_at;
}
