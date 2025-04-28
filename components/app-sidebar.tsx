"use client";

import { Icons } from "@/components/icons";
import { NavUser } from "@/components/nav-user";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Bot, User } from "@/lib/generated/prisma";
import { BotSwitcher } from "./bot-switch";

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

interface AppSidebarProps {
  orgId: string;
  botId: string;
  user: User;
  botsGroupedByOrg: OrganizationBots[];
}

export function AppSidebar({
  orgId,
  botId,
  user,
  botsGroupedByOrg,
}: AppSidebarProps) {
  const pathname = usePathname();

  // Menu items with dynamic paths
  const getItems = (orgId: string, botId: string) => [
    {
      title: "Overview",
      url: `/dashboard/${orgId}/bots/${botId}/overview`,
      icon: Icons.Home,
    },
    {
      title: "Playground",
      url: `/dashboard/${orgId}/bots/${botId}/playground`,
      icon: Icons.Terminal,
    },
    {
      title: "Tools",
      url: `/dashboard/${orgId}/bots/${botId}/tools`,
      icon: Icons.Hammer,
    },
    {
      title: "Knowledge Base",
      url: `/dashboard/${orgId}/bots/${botId}/knowledge`,
      icon: Icons.Database,
    },
    {
      title: "Deployments",
      url: `/dashboard/${orgId}/bots/${botId}/deployments`,
      icon: Icons.ArrowRight,
    },
    {
      title: "Conversations",
      url: `/dashboard/${orgId}/bots/${botId}/conversations`,
      icon: Icons.MessageSquare,
    },
  ];

  // Tool categories with dynamic paths
  const getTools = (orgId: string, botId: string) => [
    {
      title: "Settings",
      url: `/dashboard/${orgId}/bots/${botId}/settings`,
      icon: Icons.Settings,
    },
    {
      title: "Analytics",
      url: `/dashboard/${orgId}/bots/${botId}/analytics`,
      icon: Icons.Chart,
    },
    {
      title: "Templates",
      url: `/dashboard/${orgId}/bots/${botId}/templates`,
      icon: Icons.LayoutTemplate,
    },
  ];

  const items = getItems(orgId, botId);
  const tools = getTools(orgId, botId);

  // Check if a given URL is active
  const isActive = (url: string) => {
    return pathname === url || pathname.startsWith(`${url}/`);
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <BotSwitcher
          orgId={orgId}
          botId={botId}
          botsGroupedByOrg={botsGroupedByOrg}
        />
      </SidebarHeader>
      <SidebarContent className="h-full flex flex-col">
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    className={cn(
                      isActive(item.url) &&
                        "bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <a href={item.url}>
                      <item.icon
                        className={cn(
                          "h-4 w-4",
                          isActive(item.url) && "text-accent-foreground"
                        )}
                      />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="my-2" />

        <SidebarGroup>
          <SidebarGroupLabel>More</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {tools.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    className={cn(
                      isActive(item.url) &&
                        "bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <a href={item.url}>
                      <item.icon
                        className={cn(
                          "h-4 w-4",
                          isActive(item.url) && "text-accent-foreground"
                        )}
                      />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto">
          <SidebarSeparator />
          <NavUser user={user} />
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
