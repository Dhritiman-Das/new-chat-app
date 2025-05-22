"use client";

import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { OrgSidebar } from "./org-sidebar";
import { Bot, User } from "@/lib/generated/prisma";
import { UserOrganization } from "@/lib/types/prisma";
import { UserSidebar } from "./user-sidebar";

interface OrganizationBots {
  organization: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string | null;
  };
  role: string;
  bots: Bot[];
}

export function ConditionalAppSidebar({
  user,
  userOrganizations,
  botsGroupedByOrg,
}: {
  user: User;
  userOrganizations: UserOrganization[];
  botsGroupedByOrg: OrganizationBots[];
}) {
  const pathname = usePathname();

  // Check if it's a bot page
  const isBotPage =
    pathname.includes(`/bots/`) && !pathname.includes(`/bots/new`);

  // Check if the path matches dashboard/[UUID] pattern
  // UUID pattern: 8-4-4-4-12 hex digits
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  // Extract orgId from path
  let orgId = "";
  const pathParts = pathname.split("/");
  const dashboardIndex = pathParts.findIndex((part) => part === "dashboard");
  const isOrgIdPresent =
    dashboardIndex >= 0 && dashboardIndex + 1 < pathParts.length;

  if (isOrgIdPresent) {
    orgId = pathParts[dashboardIndex + 1];
  }

  // Check if the orgId is a valid UUID
  const isDashboardOrgPage = isOrgIdPresent && uuidPattern.test(orgId);

  // Extract botId from path if on a bot page
  let botId = "";
  if (isBotPage) {
    const botIdIndex = pathParts.findIndex((part) => part === "bots") + 1;
    if (botIdIndex > 0 && botIdIndex < pathParts.length) {
      botId = pathParts[botIdIndex];
    }
  }

  console.log({ isDashboardOrgPage, isBotPage, pathname, orgId });
  // Show OrgSidebar only if it's an org dashboard page and not a bot page
  if (isDashboardOrgPage && !isBotPage) {
    return (
      <OrgSidebar
        orgId={orgId}
        user={user}
        userOrganizations={userOrganizations}
      />
    );
  } else if (isBotPage) {
    return (
      <AppSidebar
        orgId={orgId}
        botId={botId}
        user={user}
        botsGroupedByOrg={botsGroupedByOrg}
      />
    );
  }

  // Default to null
  return <UserSidebar user={user} userOrganizations={userOrganizations} />;
}
