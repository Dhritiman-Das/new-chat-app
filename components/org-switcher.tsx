"use client";

import * as React from "react";
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
import { UserOrganization } from "@/lib/types/prisma";
import Image from "next/image";

interface OrganizationSwitcherProps {
  activeOrgId: string;
  organizations: UserOrganization[];
}

export function OrganizationSwitcher({
  activeOrgId,
  organizations,
}: OrganizationSwitcherProps) {
  const { isMobile } = useSidebar();

  // Find the currently active organization
  const activeOrg =
    organizations.find((org) => org.id === activeOrgId) || organizations[0];

  if (!activeOrg) {
    return null;
  }

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
                <span className="truncate font-semibold">{activeOrg.name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {activeOrg.role}
                </span>
              </div>
              <Icons.ChevronDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Organizations
            </DropdownMenuLabel>

            {organizations.map((org) => (
              <DropdownMenuItem
                key={org.id}
                asChild
                className={`gap-2 p-2 ${
                  org.id === activeOrgId ? "bg-accent" : ""
                }`}
              >
                <Link href={`/dashboard/${org.id}`}>
                  <div className="flex items-center gap-2 w-full">
                    <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                      {org.logoUrl ? (
                        <Image
                          src={org.logoUrl}
                          alt={org.name}
                          className="size-4 rounded-sm object-cover"
                        />
                      ) : (
                        <Icons.Building className="size-4" />
                      )}
                    </div>
                    <div className="font-medium">{org.name}</div>
                  </div>
                </Link>
              </DropdownMenuItem>
            ))}

            <DropdownMenuSeparator />

            <DropdownMenuItem asChild className="gap-2 p-2">
              <Link href="/dashboard/organizations/new">
                <div className="flex items-center gap-2 w-full">
                  <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                    <Icons.Add className="size-4" />
                  </div>
                  <div className="font-medium text-muted-foreground">
                    New organization
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
