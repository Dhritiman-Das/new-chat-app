import { SidebarProvider } from "@/components/ui/sidebar";
import { ConditionalAppSidebar } from "@/components/conditional-app-sidebar";
import {
  getMe,
  getUserBotsGroupedByOrg,
  getUserOrganizations,
} from "@/lib/queries/cached-queries";
import { User } from "@/lib/generated/prisma";
import { redirect } from "next/navigation";
interface BotsLayoutProps {
  children: React.ReactNode;
}

export default async function BotsLayout({ children }: BotsLayoutProps) {
  const user = await getMe();
  const userOrganizations = await getUserOrganizations();
  const botsGroupedByOrg = await getUserBotsGroupedByOrg();

  if (userOrganizations.data?.length === 0) {
    redirect("/onboarding");
  }

  return (
    <SidebarProvider>
      <ConditionalAppSidebar
        user={user.data as User}
        userOrganizations={userOrganizations.data}
        botsGroupedByOrg={botsGroupedByOrg.data}
      />
      <main className="flex-1 overflow-y-auto">
        <div className="">{children}</div>
      </main>
    </SidebarProvider>
  );
}
