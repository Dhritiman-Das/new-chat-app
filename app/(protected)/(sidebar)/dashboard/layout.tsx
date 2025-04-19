import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ConditionalAppSidebar } from "@/components/conditional-app-sidebar";
import { getMe, getUserOrganizations } from "@/lib/queries/cached-queries";
import { User } from "@/lib/generated/prisma";
import { redirect } from "next/navigation";
interface BotsLayoutProps {
  children: React.ReactNode;
}

export default async function BotsLayout({ children }: BotsLayoutProps) {
  const user = await getMe();
  const userOrganizations = await getUserOrganizations();
  if (userOrganizations.data?.length === 0) {
    redirect("/onboarding");
  }
  return (
    <SidebarProvider>
      <ConditionalAppSidebar
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
