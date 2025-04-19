import { getUserOrganizations } from "@/lib/queries/cached-queries";
import { redirect } from "next/navigation";
import CompleteClient from "./_components/complete-client";

export default async function CompletePage() {
  // Check if the user has an organization
  const { data: organizations } = await getUserOrganizations();

  // If the user doesn't have any organizations, redirect to the organization creation page
  if (!organizations || organizations.length === 0) {
    redirect("/onboarding/organization");
  }

  // Pass the first organization to the client component
  return <CompleteClient organization={organizations[0]} />;
}
