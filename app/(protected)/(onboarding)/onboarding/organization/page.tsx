import OrganizationForm from "@/components/organization-form";
import { getUserOrganizations } from "@/lib/queries/cached-queries";
import { redirect } from "next/navigation";

export default async function OrganizationOnboardingPage() {
  // Check if the user already has an organization
  const { data: existingOrganizations } = await getUserOrganizations();

  // If the user already has organizations, redirect them to the dashboard
  if (existingOrganizations && existingOrganizations.length > 0) {
    redirect("/dashboard");
  }

  return (
    <div className="container max-w-3xl py-8 space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome to AI Bots
        </h1>
        <p className="text-muted-foreground">
          Let&apos;s set up your organization to get started.
        </p>
      </div>

      <OrganizationForm isOnboarding={true} />
    </div>
  );
}
