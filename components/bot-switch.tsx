"use client";

import * as React from "react";
import { ChevronsUpDown, Plus } from "lucide-react";
import Link from "next/link";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Icons } from "./icons";
import { Bot } from "@/lib/generated/prisma";

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

interface BotSwitcherProps {
  orgId: string;
  botId: string;
  botsGroupedByOrg: OrganizationBots[];
}

export function BotSwitcher({
  orgId,
  botId,
  botsGroupedByOrg,
}: BotSwitcherProps) {
  const { isMobile } = useSidebar();

  // Find the currently active bot
  const allBots = botsGroupedByOrg.flatMap((group) => group.bots);
  const activeBot = allBots.find((bot) => bot.id === botId) || allBots[0];

  if (!activeBot) {
    return null;
  }

  // Find the organization that the active bot belongs to
  const activeBotOrg = botsGroupedByOrg.find(
    (org) => org.organization.id === activeBot.organizationId
  )?.organization;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <Icons.LogoIcon className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{activeBot.name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {activeBotOrg?.name}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            {botsGroupedByOrg.map((group) => (
              <React.Fragment key={group.organization.id}>
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  {group.organization.name}
                </DropdownMenuLabel>

                {group.bots.map((bot) => (
                  <DropdownMenuItem
                    key={bot.id}
                    asChild
                    className={`gap-2 p-2 ${
                      bot.id === activeBot.id ? "bg-accent" : ""
                    }`}
                  >
                    <Link
                      href={`/dashboard/${group.organization.id}/bots/${bot.id}/overview`}
                    >
                      <div className="flex items-center gap-2 w-full">
                        <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                          <Icons.Bot className="size-4" />
                        </div>
                        <div className="font-medium">{bot.name}</div>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                ))}

                <DropdownMenuSeparator />
              </React.Fragment>
            ))}

            <DropdownMenuItem asChild className="gap-2 p-2">
              <Link href={`/dashboard/${orgId}/bots/new`}>
                <div className="flex items-center gap-2 w-full">
                  <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                    <Plus className="size-4" />
                  </div>
                  <div className="font-medium text-muted-foreground">
                    Add bot
                  </div>
                </div>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
