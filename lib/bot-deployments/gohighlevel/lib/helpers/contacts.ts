import { createGoHighLevelClient } from "./client";

// Check if a contact has the kill_switch tag
export async function checkContactHasKillSwitch(
  client: ReturnType<typeof createGoHighLevelClient>,
  contactId: string
) {
  try {
    // Get contact's tags
    const response = await (await client).get(`/contacts/${contactId}`);

    // Check if one of the tags is kill_switch
    return (
      response.data?.contact?.tags?.some(
        (tag: { name: string }) => tag.name.toLowerCase() === "kill_switch"
      ) || false
    );
  } catch (error) {
    console.error("Error checking for kill_switch tag:", error);
    return false; // Default to allowing messages if tag check fails
  }
}
