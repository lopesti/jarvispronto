"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Building2,
  Users,
  MessageSquare,
  Package,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

type CompanyRow = {
  id: number;
  name?: string;
  users_count?: number | string;
  conversations_count?: number | string;
  products_count?: number | string;
};

type UserRow = {
  id: number;
  email?: string;
  name?: string;
  company_id?: number;
};

export default function AdminDashboard() {
  const companies = useQuery({
    queryKey: ["admin-companies"],
    queryFn: async () => {
      const { data } = await api.get("/api/admin/companies");
      return (Array.isArray(data) ? data : data?.companies || []) as CompanyRow[];
    },
  });

  const users = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data } = await api.get("/api/admin/users");
      return (Array.isArray(data) ? data : data?.users || []) as UserRow[];
    },
  });

  const companyList = companies.data || [];
  const userList = users.data || [];

  const totalCompanies = companyList.length;
  const totalUsers = userList.length;
  const totalConversations = companyList.reduce(
    (a, c) => a + Number(c.conversations_count || 0),
    0
  );
  const totalProducts = companyList.reduce(
    (a, c) => a + Number(c.products_count || 0),
    0
  );

  const loading = companies.isLoading || users.isLoading;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border px-4 py-4 sm:px-6">
        <h1 className="text-xl font-bold tracking-tight">Admin · Superadmin</h1>
        <p className="text-sm text-muted-foreground">Visão global de empresas e usuários</p>
      </div>

      <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Building2} label="Empresas" value={loading ? "…" : String(totalCompanies)} />
          <StatCard icon={Users} label="Usuários" value={loading ? "…" : String(totalUsers)} />
          <StatCard
            icon={MessageSquare}
            label="Conversas"
            value={loading ? "…" : String(totalConversations)}
          />
          <StatCard icon={Package} label="Produtos" value={loading ? "…" : String(totalProducts)} />
        </div>

        {(companies.isError || users.isError) && (
          <p className="text-sm text-destructive">
            Falha ao carregar dados admin. Verifique se sua conta é superadmin.
          </p>
        )}

        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Empresas recentes</h2>
            <Link href="/admin/companies" className="flex items-center gap-1 text-xs text-primary">
              Ver todas <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {loading && <p className="p-4 text-sm text-muted-foreground">Carregando…</p>}
            {!loading && companyList.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground">Nenhuma empresa encontrada.</p>
            )}
            {companyList.slice(0, 8).map((c) => (
              <div key={c.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="font-medium">{c.name || `Empresa #${c.id}`}</p>
                  <p className="text-xs text-muted-foreground">ID {c.id}</p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <div>{c.users_count ?? 0} usuários</div>
                  <div>{c.conversations_count ?? 0} conversas</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
    </div>
  );
}
