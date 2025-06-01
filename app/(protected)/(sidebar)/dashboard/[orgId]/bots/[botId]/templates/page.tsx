import { requireAuth } from "@/utils/auth";
import { getBotById, getOrganizationById } from "@/lib/queries/cached-queries";

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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import TemplatesList from "./templates-list";
import CreateTemplateDialog from "./create-template-dialog";

interface PageProps {
  params: Promise<{ orgId: string; botId: string }>;
}

export default async function TemplatesPage({ params }: PageProps) {
  await requireAuth();
  const { botId, orgId } = await params;

  // Fetch data in parallel
  const [{ data: bot }, { data: organization }] = await Promise.all([
    getBotById(botId),
    getOrganizationById(orgId),
  ]);

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
                <BreadcrumbPage>Templates</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Prompt Templates</h1>
          <CreateTemplateDialog orgId={orgId} botId={botId} />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Browse Templates</CardTitle>
                  <CardDescription>
                    Use templates to quickly configure your bot&apos;s system
                    prompt
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Input placeholder="Search templates..." className="w-64" />
                  <Select defaultValue="all">
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="Filter by category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="customer-support">
                        Customer Support
                      </SelectItem>
                      <SelectItem value="sales">Sales</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="public">
                <TabsList className="mb-4">
                  <TabsTrigger value="public">Public Templates</TabsTrigger>
                  <TabsTrigger value="organization">
                    Organization Templates
                  </TabsTrigger>
                  <TabsTrigger value="my">My Templates</TabsTrigger>
                </TabsList>
                <TabsContent value="public">
                  <TemplatesList
                    orgId={orgId}
                    botId={botId}
                    templateType="public"
                  />
                </TabsContent>
                <TabsContent value="organization">
                  <TemplatesList
                    orgId={orgId}
                    botId={botId}
                    templateType="organization"
                  />
                </TabsContent>
                <TabsContent value="my">
                  <TemplatesList
                    orgId={orgId}
                    botId={botId}
                    templateType="my"
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
