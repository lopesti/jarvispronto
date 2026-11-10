"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Building2, Search } from "lucide-react";
import Link from "next/link";

type AdminCompany = {
  id: number;
  name: string;
  slug: string;
  plan_code: string | null;
  subscription_status: string | null;
  created_at: string;
  users_count: number;
  conversations_count: number;
  messages_count: number;
};

export default function AdminCompaniesPage() {
  const [q, setQ] = useState("");

  const { data: companies = [], isLoading } = useQuery<AdminCompany[]>({
    queryKey: ["admin-companies", q],
    queryFn: async () => {
      const { data } = await api.get("/api/admin/companies", {
        params: q ? { q } : undefined,
      });
      return data;
    },
    refetchInterval: 30000,
  });

  const list = Array.isArray(companies) ? companies : [];

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-border px-6">
        <div>
          <h1 className="text-lg font-semibold">Empresas</h1>
          <p className="text-xs text-muted-foreground">
            Visão global de todas as empresas do sistema
          </p>
        </div>
      </header>

      <div className="page-scroll page-pad">
        <div className="mb-4 flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome, slug ou ID..."
              className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-1.5 text-sm outline-none focus:border-primary"
            />
          </div>
          <span className="text-sm text-muted-foreground">
            {list.length} {list.length === 1 ? "empresa" : "empresas"}
          </span>
        </div>

        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl border border-border bg-card" />
            ))}
          </div>
        )}

        {!isLoading && list.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 py-16 text-center">
            <Building2 className="mb-3 h-8 w-8 text-muted-foreground" />
            <h3 className="mb-1 text-base font-semibold">Nenhuma empresa</h3>
            <p className="text-sm text-muted-foreground">
              {q ? "Nenhum resultado para a busca." : "Nenhuma empresa cadastrada."}
            </p>
          </div>
        )}

        {!isLoading && list.length > 0 && (
          <ul className="space-y-2">
            {list.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/admin/companies/${c.id}`}
                  className="block rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-card/80"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium truncate">{c.name}</h3>
                        <span className="text-xs text-muted-foreground">#{c.id}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {c.slug || "sem-slug"}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium capitalize">
                        {c.plan_code || "sem-plano"}
                      </span>
                      <span className="text-xs text-muted-foreground capitalize">
                        {c.subscription_status || "-"}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{c.users_count || 0} usuários</span>
                    <span>{c.conversations_count || 0} conversas</span>
                    <span>{c.messages_count || 0} mensagens</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}