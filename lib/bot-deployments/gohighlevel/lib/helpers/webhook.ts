import crypto from "crypto";
import { gohighlevelConfig } from "../../config";

// Verify the signature of incoming webhook requests
export function verifyWebhookSignature(
  payload: string,
  signature: string
): boolean {
  try {
    const verifier = crypto.createVerify("SHA256");
    verifier.update(payload);
    return verifier.verify(gohighlevelConfig.publicKey, signature, "base64");
  } catch (error) {
    console.error("Error verifying webhook signature:", error);
    return false;
  }
}
