import { ArrowLeft } from "@/components/icons";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getUserOrganizations } from "@/lib/queries/cached-queries";
import NewBotForm from "@/components/new-bot-form";

interface PageProps {
  params: Promise<{ orgId: string }>;
}

export default async function NewBotPage({ params }: PageProps) {
  const { orgId } = await params;

  // Fetch organizations server side
  const { data: organizations } = await getUserOrganizations();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/${orgId}/bots`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Create a New Bot</h1>
      </div>

      <NewBotForm organizations={organizations} orgId={orgId} />
    </div>
  );
}
