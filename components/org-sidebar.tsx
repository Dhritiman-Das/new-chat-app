"use client";

import { Icons } from "@/components/icons";
import { SignOutButton } from "@/components/sign-out-button";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";

interface OrgSidebarProps {
  orgId: string;
}

export function OrgSidebar({ orgId }: OrgSidebarProps) {
  const pathname = usePathname();

  // Menu items with dynamic orgId
  const getItems = (orgId: string) => [
    {
      title: "Dashboard",
      url: `/dashboard/${orgId}`,
      icon: Icons.Home,
    },
    {
      title: "Bots",
      url: `/dashboard/${orgId}/bots`,
      icon: Icons.Bot,
    },
    {
      title: "Tools",
      url: `/dashboard/${orgId}/tools`,
      icon: Icons.Hammer,
    },
    {
      title: "Knowledge Vault",
      url: `/dashboard/${orgId}/knowledge-vault`,
      icon: Icons.Database,
    },
    {
      title: "Integrations",
      url: `/dashboard/${orgId}/integrations`,
      icon: Icons.Cable,
    },
    {
      title: "Deployments",
      url: `/dashboard/${orgId}/deployments`,
      icon: Icons.ArrowRight,
    },
    {
      title: "Conversations",
      url: `/dashboard/${orgId}/conversations`,
      icon: Icons.MessageSquare,
    },
  ];

  // Tool categories with dynamic orgId
  const getTools = (orgId: string) => [
    {
      title: "Settings",
      url: `/dashboard/${orgId}/settings`,
      icon: Icons.Settings,
    },
    {
      title: "Analytics",
      url: `/dashboard/${orgId}/analytics`,
      icon: Icons.Info,
    },
  ];

  const items = getItems(orgId);
  const tools = getTools(orgId);

  // Check if a given URL is active
  const isActive = (url: string) => {
    return pathname === url || pathname.startsWith(`${url}/`);
  };

  return (
    <Sidebar>
      <SidebarContent className="h-full flex flex-col">
        <SidebarGroup>
          <SidebarGroupLabel>Organization</SidebarGroupLabel>
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
          <SidebarGroupLabel>Tools</SidebarGroupLabel>
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
          <SidebarMenuItem>
            <SignOutButton />
          </SidebarMenuItem>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
