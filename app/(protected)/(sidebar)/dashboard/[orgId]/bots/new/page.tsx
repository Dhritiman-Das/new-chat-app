import { ArrowLeft } from "@/components/icons";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  getOrganizationById,
  getUserOrganizations,
} from "@/lib/queries/cached-queries";
import NewBotForm from "@/components/new-bot-form";
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
import { getBotUsageInfo } from "@/lib/payment/bot-limit-service";

interface PageProps {
  params: Promise<{ orgId: string }>;
}

export default async function NewBotPage({ params }: PageProps) {
  const { orgId } = await params;

  const [{ data: organizations }, { data: organization }] = await Promise.all([
    getUserOrganizations(),
    getOrganizationById(orgId),
  ]);

  // Fetch bot usage information
  const botUsageInfo = await getBotUsageInfo(orgId);

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
              <BreadcrumbSeparator className="hidden md:block" />
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
                <BreadcrumbPage>New Bot</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/dashboard/${orgId}/bots`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Create a New Bot</h1>
        </div>

        <div className="w-full">
          <NewBotForm
            organizations={organizations}
            orgId={orgId}
            botUsageInfo={botUsageInfo}
          />
        </div>
      </div>
    </div>
  );
}
