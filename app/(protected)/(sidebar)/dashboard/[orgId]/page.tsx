import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ orgId: string }>;
}

export default async function OrgIdPage({ params }: PageProps) {
  const { orgId } = await params;

  redirect(`/dashboard/${orgId}/bots`);
}
