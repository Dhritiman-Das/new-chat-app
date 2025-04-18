"use client";

import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { OrgSidebar } from "./org-sidebar";
import { User } from "@/lib/generated/prisma";
import { UserOrganization } from "@/lib/types/prisma";

export function ConditionalAppSidebar({
  user,
  userOrganizations,
}: {
  user: User;
  userOrganizations: UserOrganization[];
}) {
  const pathname = usePathname();
  const isBotPage = pathname.includes(`/bots/`);

  // Extract orgId from path
  let orgId = "";
  const pathParts = pathname.split("/");
  const dashboardIndex = pathParts.findIndex((part) => part === "dashboard");
  const isOrgIdPresent =
    dashboardIndex >= 0 && dashboardIndex + 1 < pathParts.length;

  if (isOrgIdPresent) {
    orgId = pathParts[dashboardIndex + 1];
  }

  // Extract botId from path if on a bot page
  let botId = "";
  if (isBotPage) {
    const botIdIndex = pathParts.findIndex((part) => part === "bots") + 1;
    if (botIdIndex > 0 && botIdIndex < pathParts.length) {
      botId = pathParts[botIdIndex];
    }
  }

  if (!isBotPage)
    return (
      <OrgSidebar
        orgId={orgId}
        user={user}
        userOrganizations={userOrganizations}
      />
    );

  return <AppSidebar orgId={orgId} botId={botId} user={user} />;
}
