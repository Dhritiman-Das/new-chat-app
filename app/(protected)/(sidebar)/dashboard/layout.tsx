import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ConditionalAppSidebar } from "@/components/conditional-app-sidebar";
import { getMe, getUserOrganizations } from "@/lib/queries/cached-queries";
import { User } from "@/lib/generated/prisma";
interface BotsLayoutProps {
  children: React.ReactNode;
  params: Promise<{ orgId: string }>;
}

export default async function BotsLayout({
  children,
  params,
}: BotsLayoutProps) {
  const { orgId } = await params;
  const user = await getMe();
  const userOrganizations = await getUserOrganizations();
  return (
    <SidebarProvider>
      <ConditionalAppSidebar
        orgId={orgId}
        user={user.data as User}
        userOrganizations={userOrganizations.data}
      />
      <main className="flex-1 overflow-y-auto">
        <div className="container">
          <SidebarTrigger className="mb-4 md:hidden" />
          {children}
        </div>
      </main>
    </SidebarProvider>
  );
}
