/**
 * Webhook verification services for different providers
 */

import crypto from "crypto";
import { gohighlevelConfig } from "../config/providers-config";

/**
 * Verify the signature of incoming GoHighLevel webhook requests
 */
export function verifyGoHighLevelWebhook(
  payload: string,
  signature: string
): boolean {
  try {
    const verifier = crypto.createVerify("SHA256");
    verifier.update(payload);
    return verifier.verify(gohighlevelConfig.publicKey, signature, "base64");
  } catch (error) {
    console.error("Error verifying GoHighLevel webhook signature:", error);
    return false;
  }
}

/**
 * Generic webhook verification function that routes to the appropriate provider
 */
export function verifyWebhookSignature(
  provider: string,
  payload: string,
  signature: string
): boolean {
  switch (provider) {
    case "gohighlevel":
      return verifyGoHighLevelWebhook(payload, signature);
    // Add more provider verifications as needed
    default:
      console.error(`No webhook verification method for provider: ${provider}`);
      return false;
  }
}
