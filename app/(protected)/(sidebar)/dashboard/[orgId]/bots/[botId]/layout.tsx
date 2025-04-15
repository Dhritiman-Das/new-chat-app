import { SidebarTrigger } from "@/components/ui/sidebar";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex-1 overflow-y-auto">
      <div className="container">
        <SidebarTrigger className="mb-4 md:hidden" />
        {children}
      </div>
    </main>
  );
}
