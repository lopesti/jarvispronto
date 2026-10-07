"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  adminGetTickets,
  statusLabel,
  statusColor,
  priorityLabel,
} from "@/lib/support-api";
import { LifeBuoy, Filter } from "lucide-react";

export default function AdminSupportPage() {
  const [statusFilter, setStatusFilter] = useState<string>("");

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["admin-support-tickets", statusFilter],
    queryFn: () =>
      adminGetTickets(statusFilter ? { status: statusFilter } : undefined),
    refetchInterval: 15000,
  });

  const list = Array.isArray(tickets) ? tickets : [];

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-border px-6">
        <div>
          <h1 className="text-lg font-semibold">Suporte - Visao Global</h1>
          <p className="text-xs text-muted-foreground">
            Todos os chamados de todas as empresas
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-4 flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
          >
            <option value="">Todos os status</option>
            <option value="open">Aberto</option>
            <option value="waiting">Aguardando</option>
            <option value="resolved">Resolvido</option>
            <option value="closed">Fechado</option>
          </select>

          <span className="text-sm text-muted-foreground">
            {list.length} {list.length === 1 ? "chamado" : "chamados"}
          </span>
        </div>

        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-xl border border-border bg-card"
              />
            ))}
          </div>
        )}

        {!isLoading && list.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 py-16 text-center">
            <LifeBuoy className="mb-3 h-8 w-8 text-muted-foreground" />
            <h3 className="mb-1 text-base font-semibold">Sem chamados</h3>
            <p className="text-sm text-muted-foreground">
              Nenhum chamado encontrado com os filtros atuais.
            </p>
          </div>
        )}

        {!isLoading && list.length > 0 && (
          <ul className="space-y-3">
            {list.map((t: any) => {
              const unread = Number(t.unread_count || 0);
              return (
                <li key={t.id}>
                  <Link
                    href={`/admin/support/${t.id}`}
                    className="block rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-card/80"
                  >
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {unread > 0 && (
                          <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
                        )}
                        <h3 className="font-medium">{t.subject}</h3>
                        <span className="text-xs text-muted-foreground">
                          #{t.id}
                        </span>
                      </div>
                      <span
                        className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusColor(
                          t.status
                        )}`}
                      >
                        {statusLabel(t.status)}
                      </span>
                    </div>
                    <div className="mb-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {t.company_name}
                      </span>
                      <span>•</span>
                      <span>{priorityLabel(t.priority)}</span>
                      <span>•</span>
                      <span className="capitalize">{t.category || "Geral"}</span>
                    </div>
                    {t.last_message && (
                      <p className="mb-1 line-clamp-1 text-sm text-muted-foreground">
                        {t.last_message}
                      </p>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Atualizado em{" "}
                      {new Date(t.updated_at).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}