"use client";

import { Header } from "@/components/layout/header";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  getTickets,
  statusLabel,
  statusColor,
  type SupportTicket,
} from "@/lib/support-api";
import { LifeBuoy, Plus, MessageSquare } from "lucide-react";

export default function SupportPage() {
  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["support-tickets"],
    queryFn: getTickets,
    refetchInterval: 15000,
  });

  const list = Array.isArray(tickets) ? tickets : [];
  const totalUnread = list.reduce(
    (acc, t) => acc + Number(t.unread_count || 0),
    0
  );

  return (
    <>
      <Header
        title="Suporte"
        subtitle="Abra e acompanhe seus chamados com o time Jarvis"
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MessageSquare className="h-4 w-4" />
            <span>
              {list.length} {list.length === 1 ? "chamado" : "chamados"}
              {totalUnread > 0 && (
                <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {totalUnread} nova{totalUnread > 1 ? "s" : ""}
                </span>
              )}
            </span>
          </div>

          <Link
            href="/support/new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Novo chamado
          </Link>
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
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
              <LifeBuoy className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mb-1 text-base font-semibold">Nenhum chamado ainda</h3>
            <p className="mb-6 max-w-sm text-sm text-muted-foreground">
              Precisa de ajuda? Abra um chamado e o time Jarvis vai responder
              por aqui.
            </p>
            <Link
              href="/support/new"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Abrir primeiro chamado
            </Link>
          </div>
        )}

        {!isLoading && list.length > 0 && (
          <ul className="space-y-3">
            {list.map((t: SupportTicket) => {
              const unread = Number(t.unread_count || 0);
              return (
                <li key={t.id}>
                  <Link
                    href={`/support/${t.id}`}
                    className="block rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-card/80"
                  >
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <h3 className="flex items-center gap-2 font-medium">
                        {unread > 0 && (
                          <span className="inline-block h-2 w-2 rounded-full bg-primary" />
                        )}
                        {t.subject}
                      </h3>
                      <span
                        className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusColor(
                          t.status
                        )}`}
                      >
                        {statusLabel(t.status)}
                      </span>
                    </div>
                    {t.last_message && (
                      <p className="mb-2 line-clamp-1 text-sm text-muted-foreground">
                        {t.last_message}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="capitalize">
                        {t.category || "Geral"}
                      </span>
                      <span>
                        {new Date(t.updated_at).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
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