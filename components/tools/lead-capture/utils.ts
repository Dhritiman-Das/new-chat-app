import { Lead } from "./types";

// Function to get all field keys from leads
export function getAllLeadFieldKeys(leads: Lead[]): string[] {
  const fieldKeys = new Set<string>();

  // Add standard fields first
  ["name", "email", "phone", "company", "source", "status"].forEach((field) =>
    fieldKeys.add(field)
  );

  // Add custom property fields
  leads.forEach((lead) => {
    if (lead.properties) {
      Object.keys(lead.properties).forEach((key) => fieldKeys.add(key));
    }
  });

  return Array.from(fieldKeys);
}
