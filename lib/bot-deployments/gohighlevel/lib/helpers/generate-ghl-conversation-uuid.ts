import { v5 as uuidv5 } from "uuid";

const NAMESPACE_UUID = "124e4567-e89b-12d3-a456-426614184001";

/**
 * Generate a deterministic UUID v5 from GoHighLevel contactId and locationId.
 * @param contactId GoHighLevel contact ID (e.g., "1234567890")
 * @param locationId GoHighLevel location ID (e.g., "1234567890")
 * @returns UUID string
 */
export function generateGHLConversationUUID(
  contactId: string,
  locationId: string
): string {
  // Combine contactId and locationId as the "name" input for UUID v5
  const name = `${contactId}:${locationId}`;
  return uuidv5(name, NAMESPACE_UUID);
}
