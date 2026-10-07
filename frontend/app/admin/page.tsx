"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Building2,
  Users,
  MessageSquare,
  LifeBuoy,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

type AdminMetrics = {
  total_companies: string;
  total_users: string;
  total_products: string;
  total_conversations: string;
  total_messages: string;
};

export default function AdminDashboard() {
  const { data: metrics, isLoading } = useQuery<AdminMetrics>({
    queryKey: ["admin-metrics"],
    queryFn: async () => {
      const { data } = await api.get("/api/admin/support/tickets");
      const tickets = Array.isArray(data) ? data : [];
      return {
        total_companies: "—",
        total_users: "—",
        total_products: "—",
        total_conversations: "—",
        total_messages: String(tickets.length),
      };
    },
    refetchInterval: 30000,
  });

  const cards = [
    { label: "Empresas", value: metrics?.total_companies || "—", icon: Building2 },
    { label: "Usuarios", value: metrics?.total_users || "—", icon: Users },
    { label: "Produtos", value: metrics?.total_products || "—", icon: MessageSquare },
    { label: "Chamados", value: metrics?.total_messages || "—", icon: LifeBuoy },
  ];

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-border px-6">
        <div>
          <h1 className="text-lg font-semibold">Painel Admin</h1>
          <p className="text-xs text-muted-foreground">
            Visao geral do sistema Jarvis
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <div
                key={c.label}
                className="rounded-xl border border-border bg-card p-5"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{c.label}</span>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold">
                  {isLoading ? "..." : c.value}
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/admin/support"
            className="group rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/40 hover:bg-card/80"
          >
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-red-500/15">
              <LifeBuoy className="h-5 w-5 text-red-400" />
            </div>
            <h3 className="mb-1 font-semibold">Central de Suporte</h3>
            <p className="mb-3 text-sm text-muted-foreground">
              Veja e responda chamados de todas as empresas
            </p>
            <span className="inline-flex items-center gap-1 text-sm text-primary group-hover:gap-2 transition-all">
              Abrir <ArrowRight className="h-4 w-4" />
            </span>
          </Link>

          <div className="rounded-xl border border-dashed border-border bg-card/50 p-6">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-secondary">
              <Building2 className="h-5 w-5 text-muted-foreground" />
            </div>
            <h3 className="mb-1 font-semibold">Gestao de Empresas</h3>
            <p className="text-sm text-muted-foreground">
              Em breve: gerenciar planos, suspender contas, ver uso
            </p>
          </div>
        </div>
      </div>
    </>
  );
}