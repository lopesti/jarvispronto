"use client";

import { Header } from "@/components/layout/header";
import { useQuery } from "@tanstack/react-query";
import {
  getConversations,
  getChannelStatus,
  stepLabel,
} from "@/lib/api";
import Link from "next/link";
import { MessageSquare, Radio, HandMetal, TrendingUp } from "lucide-react";

export default function OverviewPage() {
  const { data: conversations = [] } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => getConversations(),
    refetchInterval: 15000,
  });

  const { data: channels } = useQuery({
    queryKey: ["channels"],
    queryFn: getChannelStatus,
    refetchInterval: 15000,
  });

  const list = Array.isArray(conversations) ? conversations : [];
  const totalConversations = list.length;
  const needsHuman = list.filter((c) => c.needs_human).length;
  const totalMessages = list.reduce(
    (acc, c) => acc + Number(c.messageCount || 0),
    0
  );
  const avgScore =
    list.length > 0
      ? Math.round(
          list.reduce((acc, c) => acc + Number(c.lead_score || 0), 0) /
            list.length
        )
      : 0;

  const waConnected = !!channels?.whatsapp?.connected;

  return (
    <>
      <Header
        title="Dashboard"
        subtitle="Cockpit de vendas · funil, score e handoff"
      />
      <div className="flex-1 overflow-y-auto p-6">
        {!waConnected && (
          <div className="mb-6 flex flex-col gap-3 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary">
              <Radio className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">WhatsApp ainda não conectado</p>
              <p className="text-xs text-muted-foreground">
                Conecte o canal para o funil começar a receber leads.
              </p>
            </div>
            <Link
              href="/channels"
              className="inline-flex rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              Ir para Canais
            </Link>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
              <p className="text-xs">Conversas</p>
            </div>
            <p className="mt-2 text-2xl font-bold">{totalConversations}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <HandMetal className="h-4 w-4" />
              <p className="text-xs">Precisa humano</p>
            </div>
            <p className="mt-2 text-2xl font-bold text-amber-300">{needsHuman}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <p className="text-xs">Score médio</p>
            </div>
            <p className="mt-2 text-2xl font-bold">{avgScore}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Mensagens</p>
            <p className="mt-2 text-2xl font-bold">{totalMessages}</p>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-border bg-card p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Últimas conversas</h3>
            <Link
              href="/conversations"
              className="text-xs text-primary hover:underline"
            >
              Ver inbox
            </Link>
          </div>
          {list.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Nenhuma conversa ainda
              </p>
              <Link
                href="/channels"
                className="text-xs text-primary hover:underline"
              >
                Conectar canal →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {list.slice(0, 6).map((conv) => (
                <div
                  key={conv.phone}
                  className="flex items-center justify-between border-b border-border pb-3 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {conv.display_name ||
                        conv.phone.replace("@s.whatsapp.net", "")}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {conv.lastMessage || "Sem mensagens"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {conv.needs_human && (
                      <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-300">
                        humano
                      </span>
                    )}
                    <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {stepLabel(conv.current_step)}
                    </span>
                    <span className="rounded bg-primary/15 px-2 py-0.5 text-xs text-primary">
                      {Number(conv.lead_score || 0)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
