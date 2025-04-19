import { getUserOrganizations } from "@/lib/queries/cached-queries";
import { redirect } from "next/navigation";
import SurveyClient from "./_components/survey-client";

export default async function SurveyPage() {
  // Check if the user already has an organization
  const { data: existingOrganizations } = await getUserOrganizations();

  // If the user doesn't have any organizations, redirect to the organization creation page
  if (!existingOrganizations || existingOrganizations.length === 0) {
    redirect("/onboarding/organization");
  }

  return <SurveyClient redirectPath="/onboarding/complete" />;
}
