"use client";

import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { OrgSidebar } from "./org-sidebar";

export function ConditionalAppSidebar({ orgId }: { orgId: string }) {
  const pathname = usePathname();
  const isBotPage = pathname.includes(`/dashboard/${orgId}/bots/`);

  if (!isBotPage) return <OrgSidebar />;

  return <AppSidebar />;
}
