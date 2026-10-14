"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Building2, Search } from "lucide-react";

type AdminCompany = {
  id: number;
  name: string;
  slug: string;
  plan_code: string | null;
  subscription_status: string | null;
  created_at: string;
  users_count: number | string;
  conversations_count: number | string;
  messages_count: number | string;
};

export default function AdminCompaniesPage() {
  const [list, setList] = useState<AdminCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get("/api/admin/companies");
        if (cancelled) return;
        setList(Array.isArray(data) ? data : data.companies || []);
      } catch (err: unknown) {
        if (cancelled) return;
        const msg =
          (err as { response?: { data?: { error?: string } } })?.response?.data
            ?.error || "Erro ao carregar empresas";
        setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return list;
    return list.filter(
      (c) =>
        c.name?.toLowerCase().includes(term) ||
        c.slug?.toLowerCase().includes(term) ||
        String(c.id).includes(term)
    );
  }, [list, q]);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Empresas</h1>
            <p className="text-sm text-muted-foreground">
              {list.length}{" "}
              {list.length === 1
                ? "empresa cadastrada"
                : "empresas cadastradas"}
            </p>
          </div>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome, slug ou ID"
            className="w-full rounded-lg border border-border bg-secondary/50 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {loading && (
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Carregando empresas...
        </div>
      )}

      {error && !loading && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          {list.length === 0
            ? "Nenhuma empresa cadastrada ainda."
            : "Nenhuma empresa encontrada para essa busca."}
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <ul className="grid gap-3">
          {filtered.map((c) => (
            <li key={c.id}>
              <Link
                href={`/admin/companies/${c.id}`}
                className="block rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-card/80"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate font-semibold">{c.name}</h2>
                      {c.plan_code && (
                        <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          {c.plan_code}
                        </span>
                      )}
                      {c.subscription_status && (
                        <span className="rounded-md bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                          {c.subscription_status}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      #{c.id} · {c.slug}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>{c.users_count || 0} usuários</span>
                  <span>{c.conversations_count || 0} conversas</span>
                  <span>{c.messages_count || 0} mensagens</span>
                  {c.created_at && (
                    <span>
                      criada em{" "}
                      {new Date(c.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}