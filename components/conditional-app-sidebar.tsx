"use client";

import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { OrgSidebar } from "./org-sidebar";

export function ConditionalAppSidebar({ orgId }: { orgId: string }) {
  const pathname = usePathname();
  const isBotPage = pathname.includes(`/dashboard/${orgId}/bots/`);

  // Extract botId from path if on a bot page
  let botId = "";
  if (isBotPage) {
    const pathParts = pathname.split("/");
    const botIdIndex = pathParts.findIndex((part) => part === "bots") + 1;
    if (botIdIndex > 0 && botIdIndex < pathParts.length) {
      botId = pathParts[botIdIndex];
    }
  }

  if (!isBotPage) return <OrgSidebar orgId={orgId} />;

  return <AppSidebar orgId={orgId} botId={botId} />;
}
