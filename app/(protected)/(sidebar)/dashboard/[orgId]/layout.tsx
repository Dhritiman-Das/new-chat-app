import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ConditionalAppSidebar } from "@/components/conditional-app-sidebar";

interface BotsLayoutProps {
  children: React.ReactNode;
  params: Promise<{ orgId: string }>;
}

export default async function BotsLayout({
  children,
  params,
}: BotsLayoutProps) {
  const { orgId } = await params;

  return (
    <SidebarProvider>
      <ConditionalAppSidebar orgId={orgId} />
      <main className="flex-1 overflow-y-auto">
        <div className="container">
          <SidebarTrigger className="mb-4 md:hidden" />
          {children}
        </div>
      </main>
    </SidebarProvider>
  );
}
