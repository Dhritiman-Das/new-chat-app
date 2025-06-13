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
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Icons } from "@/components/icons";

import { getBotById, getOrganizationById } from "@/lib/queries/cached-queries";
import { requireAuth } from "@/utils/auth";
import CustomToolForm from "@/components/tools/custom-tool-form";
import { BackButton } from "@/components/back-button";

interface PageProps {
  params: Promise<{ orgId: string; botId: string }>;
}

export default async function CreateNewToolPage({ params }: PageProps) {
  await requireAuth();
  const { botId, orgId } = await params;

  // Fetch bot data and organization
  const [botResponse, organizationResponse] = await Promise.all([
    getBotById(botId),
    getOrganizationById(orgId),
  ]);

  const bot = botResponse?.data;
  const organization = organizationResponse?.data;

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
                <BreadcrumbLink href={`/dashboard/${orgId}`}>
                  {organization?.slug || orgId}
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
                <BreadcrumbLink
                  href={`/dashboard/${orgId}/bots/${botId}/tools`}
                >
                  Tools
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>New</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <BackButton />
            <div>
              <h1 className="text-2xl font-bold">Create Custom Tool</h1>
              <p className="text-muted-foreground">
                Create a custom tool that your bot can use to interact with
                external services.
              </p>
            </div>
          </div>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Icons.BookOpen className="h-4 w-4" />
                Guide
              </Button>
            </SheetTrigger>
            <SheetContent className="min-w-[640px]">
              <SheetHeader>
                <SheetTitle>How Custom Tools Work</SheetTitle>
                <SheetDescription>
                  Learn how to build and integrate custom tools with your bot
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-6 px-4 overflow-y-auto">
                <div>
                  <h4 className="font-medium mb-2">Request Format</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Your server will receive POST requests with the following
                    structure:
                  </p>
                  <pre className="p-3 bg-muted rounded-md text-sm overflow-x-auto">
                    {`{
  "parameters": { /* user input */ },
  "context": {
    "botId": "...",
    "userId": "...",
    "organizationId": "...",
    "conversationId": "..."
  },
  "metadata": {
    "timestamp": "...",
    "toolVersion": "1.0.0"
  }
}`}
                  </pre>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Expected Response</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Your server should respond with:
                  </p>
                  <pre className="p-3 bg-muted rounded-md text-sm overflow-x-auto">
                    {`{
  "success": true,
  "data": { /* your response data */ },
  "message": "Optional success message"
}`}
                  </pre>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Authentication</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    The secret token you provide will be included in the
                    Authorization header:
                  </p>
                  <pre className="p-3 bg-muted rounded-md text-sm overflow-x-auto">
                    {`Authorization: Bearer YOUR_SECRET_TOKEN`}
                  </pre>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Error Handling</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    For errors, respond with:
                  </p>
                  <pre className="p-3 bg-muted rounded-md text-sm overflow-x-auto">
                    {`{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE" // optional
}`}
                  </pre>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <CustomToolForm botId={botId} orgId={orgId} mode="create" />
      </div>
    </div>
  );
}
