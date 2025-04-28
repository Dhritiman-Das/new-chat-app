import { requireAuth } from "@/utils/auth";
import { getBotById } from "@/lib/queries/cached-queries";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import BotSettingsForm from "./bot-settings-form";
import DeleteBotDialog from "./delete-bot-dialog";

interface PageProps {
  params: Promise<{ orgId: string; botId: string }>;
}

export default async function BotSettings({ params }: PageProps) {
  await requireAuth();
  const { botId, orgId } = await params;

  // Fetch bot data
  const botResponse = await getBotById(botId);
  const bot = botResponse?.data;

  if (!bot) {
    return <div className="p-6">Bot not found</div>;
  }

  return (
    <div>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/">Home</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbLink href={`/dashboard/${orgId}`}>
                  Dashboard
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href={`/dashboard/${orgId}/bots`}>
                  Bots
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink
                  href={`/dashboard/${orgId}/bots/${botId}/overview`}
                >
                  {bot?.name || "Bot"}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Settings</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Bot Settings</h1>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Bot Information</CardTitle>
              <CardDescription>
                Update your bot&apos;s basic information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BotSettingsForm bot={bot} orgId={orgId} />
            </CardContent>
          </Card>

          <Card className="border-destructive border-dashed">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>
                Destructive actions that can&apos;t be undone
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Delete Bot</h3>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete this bot and all associated data. This
                    action cannot be undone.
                  </p>
                </div>
                <DeleteBotDialog bot={bot} orgId={orgId} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
