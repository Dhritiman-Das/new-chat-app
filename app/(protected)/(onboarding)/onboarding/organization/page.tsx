import { getUserOrganizations } from "@/lib/queries/cached-queries";
import { redirect } from "next/navigation";
import OrganizationClient from "./_components/organization-client";

export default async function OrganizationOnboardingPage() {
  // Check if the user already has an organization
  const { data: existingOrganizations } = await getUserOrganizations();

  // If the user already has organizations, redirect them to the dashboard
  if (existingOrganizations && existingOrganizations.length > 0) {
    redirect("/dashboard");
  }

  return (
    <div className="container max-w-2xl px-4">
      <OrganizationClient redirectPath="/onboarding/survey" />
    </div>
  );
}
