export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex-1 overflow-y-auto">
      <div className="container">{children}</div>
    </main>
  );
}
