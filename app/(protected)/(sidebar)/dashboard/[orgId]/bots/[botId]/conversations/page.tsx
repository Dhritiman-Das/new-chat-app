import { requireAuth } from "@/utils/auth";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  getBotById,
  getCachedConversationStatusCounts,
  getCachedConversations,
  getOrganizationById,
} from "@/lib/queries/cached-queries";
import * as React from "react";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { Shell } from "@/components/shell";
import { ConversationsTable } from "./_components/conversations-table";

import { getValidFilters } from "./_lib/utils";
import type { SearchParams } from "./_lib/types";
import {
  searchParamsCache,
  type ConversationFilterSchema,
} from "./_lib/validations";

interface PageProps {
  params: Promise<{ orgId: string; botId: string }>;
  searchParams: Promise<SearchParams>;
}

export default async function ConversationsPage({
  params,
  searchParams,
}: PageProps) {
  await requireAuth();
  const { botId, orgId } = await params;
  const search = searchParamsCache.parse(await searchParams);

  const [{ data: bot }, { data: organization }] = await Promise.all([
    getBotById(botId),
    getOrganizationById(orgId),
  ]);

  // Get valid filters - could be an object or string
  const validFilters = getValidFilters<ConversationFilterSchema>(
    search.filters
  );

  // Fetch conversations data
  const promises = Promise.all([
    getCachedConversations(
      botId,
      search.page,
      search.per_page,
      search.sort,
      validFilters // Pass the filters directly
    ),
    getCachedConversationStatusCounts(botId),
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
                <BreadcrumbPage>Conversations</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <Shell className="gap-2 p-6">
        <React.Suspense
          fallback={
            <DataTableSkeleton
              columnCount={6}
              filterCount={2}
              cellWidths={["10rem", "15rem", "10rem", "10rem", "12rem", "6rem"]}
              shrinkZero
            />
          }
        >
          <ConversationsTable botId={botId} promises={promises} />
        </React.Suspense>
      </Shell>
    </div>
  );
}
