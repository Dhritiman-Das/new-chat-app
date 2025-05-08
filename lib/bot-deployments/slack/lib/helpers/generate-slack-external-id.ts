import { v5 as uuidv5 } from "uuid";

const NAMESPACE_UUID = "124e4567-e89b-12d3-a456-426614184000";

/**
 * Generate a deterministic UUID v5 from Slack channel and ts.
 * @param channel Slack channel ID (e.g., "C1234567890")
 * @param ts Slack message timestamp (e.g., "1708992713.265039")
 * @returns UUID string
 */
export function generateSlackThreadUUID(channel: string, ts: string): string {
  // Combine channel and ts as the "name" input for UUID v5
  const name = `${channel}:${ts}`;
  return uuidv5(name, NAMESPACE_UUID);
}
