import { Icons } from "@/components/icons";
import { SignOutButton } from "@/components/sign-out-button";

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

// Menu items.
const items = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Icons.Home,
  },
  {
    title: "Playground",
    url: "/playground",
    icon: Icons.Terminal,
  },
  {
    title: "Tools",
    url: "/tools",
    icon: Icons.Hammer,
  },
  {
    title: "Knowledge Vault",
    url: "/knowledge-vault",
    icon: Icons.Database,
  },
  {
    title: "Integrations",
    url: "/integrations",
    icon: Icons.Cable,
  },
  {
    title: "Deployments",
    url: "/deployments",
    icon: Icons.ArrowRight,
  },
  {
    title: "Conversations",
    url: "/conversations",
    icon: Icons.MessageSquare,
  },
];

// Tool categories
const tools = [
  {
    title: "Settings",
    url: "/settings",
    icon: Icons.Settings,
  },
  {
    title: "Analytics",
    url: "/analytics",
    icon: Icons.Info,
  },
];

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarContent className="h-full flex flex-col">
        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <item.icon className="h-4 w-4" />
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
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <item.icon className="h-4 w-4" />
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
