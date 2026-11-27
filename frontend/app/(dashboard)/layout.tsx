import { Sidebar } from "@/components/layout/sidebar";
import { AuthGuard } from "@/components/auth-guard";
import { UsageBanner } from "@/components/billing/usage-banner";
import { AdminCompanyContextBanner } from "@/components/layout/admin-company-context-banner";

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
          <AdminCompanyContextBanner />
          <UsageBanner />
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}

