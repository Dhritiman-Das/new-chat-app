import { ContactsClient } from "@/lib/auth/clients/gohighlevel";

// New version using the auth module's ContactsClient
export async function checkContactHasKillSwitchWithAuthClient(
  contactsClient: ContactsClient,
  contactId: string
) {
  try {
    const contact = await contactsClient.getContact(contactId);
    return (
      contact.tags?.some(
        (tag: { name: string }) => tag.name.toLowerCase() === "kill_switch"
      ) || false
    );
  } catch (error) {
    console.error("Error checking for kill_switch tag:", error);
    return false; // Default to allowing messages if tag check fails
  }
}
