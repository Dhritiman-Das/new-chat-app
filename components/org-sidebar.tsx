"use client";

import { Icons } from "@/components/icons";
import { usePathname } from "next/navigation";
import Link from "next/link";
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
import { NavUser } from "./nav-user";
import { User } from "@/lib/generated/prisma";
import { useMemo } from "react";
import { UserOrganization } from "@/lib/types/prisma";
import { OrganizationSwitcher } from "./org-switcher";
// import { getUserOrganizations } from "@/lib/queries/cached-queries";

interface OrgSidebarProps {
  orgId: string;
  user: User;
  userOrganizations: UserOrganization[];
}

export function OrgSidebar({
  orgId,
  user,
  userOrganizations,
}: OrgSidebarProps) {
  const pathname = usePathname();

  // Bot level
  const botItems = useMemo(
    () => [
      {
        title: "All bots",
        url: `/dashboard/bots`,
      },
    ],
    []
  );

  const orgItems = useMemo(
    () =>
      userOrganizations.map((org) => ({
        title: org.name,
        url: `/dashboard/${org.id}`,
      })),
    [userOrganizations]
  );

  const accountItems = useMemo(
    () => [
      {
        title: "Billing",
        url: `/dashboard/${orgId}/billing`,
        icon: Icons.Billing,
      },
      // {
      //   title: "Access tokens",
      //   url: `/dashboard/${orgId}/access-tokens`,
      //   icon: Icons.Key,
      // },
      // {
      //   title: "Notifications",
      //   url: `/dashboard/${orgId}/notifications`,
      //   icon: Icons.Bell,
      // },
    ],
    [orgId]
  );

  const documentationItems = useMemo(
    () => [
      // {
      //   title: "API Reference",
      //   url: `/dashboard/api-reference`,
      //   icon: Icons.ExternalLink,
      // },
      // {
      //   title: "Change log",
      //   url: `/dashboard/change-log`,
      //   icon: Icons.ExternalLink,
      // },
      {
        title: "Contact us",
        url: "mailto:iamdhritiman01@gmail.com",
        icon: Icons.Mail,
      },
      {
        title: "Follow us on X",
        url: "https://x.com/bontidotco",
        icon: Icons.ExternalLink,
      },
    ],
    []
  );

  // Check if a given URL is active
  const isActive = (url: string) => {
    return pathname === url || pathname.startsWith(`${url}/`);
  };

  return (
    <Sidebar>
      {/* <SidebarHeader>
        <div className="flex items-center gap-2 justify-center pt-2">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Icons.LogoIcon className="size-4" />
          </div>
          <span className="text-md font-medium tracking-widest">Bonti</span>
        </div>
      </SidebarHeader> */}
      <SidebarHeader>
        <OrganizationSwitcher
          activeOrgId={orgId}
          organizations={userOrganizations}
        />
      </SidebarHeader>
      <SidebarContent className="h-full flex flex-col">
        <SidebarGroup>
          <SidebarGroupLabel>Bots</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {botItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    className={cn(
                      isActive(item.url) &&
                        "bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <Link href={item.url} prefetch={true}>
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="" />

        <SidebarGroup>
          <SidebarGroupLabel>Organizations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {orgItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    className={cn(
                      isActive(item.url) &&
                        "bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <Link href={item.url} prefetch={true}>
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="" />

        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {accountItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    className={cn(
                      isActive(item.url) &&
                        "bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <Link href={item.url} prefetch={true}>
                      <item.icon
                        className={cn(
                          "h-4 w-4",
                          isActive(item.url) && "text-accent-foreground"
                        )}
                      />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="" />

        <SidebarGroup>
          <SidebarGroupLabel>Contact</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {documentationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    className={cn(
                      isActive(item.url) &&
                        "bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <Link href={item.url} prefetch={true}>
                      <item.icon
                        className={cn(
                          "h-4 w-4",
                          isActive(item.url) && "text-accent-foreground"
                        )}
                      />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto">
          <SidebarSeparator />
          <NavUser user={user} activeOrgId={orgId} />
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
