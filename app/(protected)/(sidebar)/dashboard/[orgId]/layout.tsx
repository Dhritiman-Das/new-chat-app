import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ConditionalAppSidebar } from "@/components/conditional-app-sidebar";

// Server component
export default async function BotsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { orgId: string };
}) {
  return (
    <SidebarProvider>
      <ConditionalAppSidebar orgId={params.orgId} />
      <main className="flex-1 overflow-y-auto">
        <div className="container">
          <SidebarTrigger className="mb-4 md:hidden" />
          {children}
        </div>
      </main>
    </SidebarProvider>
  );
}
