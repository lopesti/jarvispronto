import { Sidebar } from "@/components/layout/sidebar";
import { AuthGuard } from "@/components/auth-guard";
import { UsageBanner } from "@/components/billing/usage-banner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="flex h-[100dvh] overflow-hidden bg-background">
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <UsageBanner />
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
