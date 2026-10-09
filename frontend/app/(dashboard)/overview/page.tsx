"use client";

import { Header } from "@/components/layout/header";
import { useQuery } from "@tanstack/react-query";
import {
  getConversations,
  getChannelStatus,
  stepLabel,
} from "@/lib/api";
import { EmptyState } from "@/components/ui/empty-state";
import Link from "next/link";
import {
  MessageSquare,
  Radio,
  HandMetal,
  TrendingUp,
  Send,
  MessageCircle,
  AlertTriangle,
} from "lucide-react";

export default function OverviewPage() {
  const { data: conversations = [], isLoading } = useQuery({
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
  const urgentList = list.filter((c) => c.needs_human).slice(0, 3);

  return (
    <>
      <Header
        title="Dashboard"
        subtitle="Cockpit de vendas · funil, score e handoff"
      />

      <div className="flex-1 overflow-y-auto p-6">
        {/* Banner WhatsApp desconectado */}
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

        {/* KPIs */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-xl border border-border bg-card/50"
              />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              icon={MessageSquare}
              label="Conversas"
              value={totalConversations}
              color="text-blue-400"
              bg="bg-blue-500/15"
            />
            <KpiCard
              icon={HandMetal}
              label="Precisa humano"
              value={needsHuman}
              color={needsHuman > 0 ? "text-amber-300" : "text-muted-foreground"}
              bg={needsHuman > 0 ? "bg-amber-500/15" : "bg-secondary"}
              alert={needsHuman > 0}
            />
            <KpiCard
              icon={TrendingUp}
              label="Score médio"
              value={avgScore}
              color="text-emerald-400"
              bg="bg-emerald-500/15"
            />
            <KpiCard
              icon={Send}
              label="Mensagens"
              value={totalMessages}
              color="text-cyan-400"
              bg="bg-cyan-500/15"
            />
          </div>
        )}

        {/* Precisa atenção */}
        {!isLoading && urgentList.length > 0 && (
          <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <h3 className="text-sm font-semibold">
                Precisa de atenção ({urgentList.length})
              </h3>
            </div>
            <div className="space-y-2">
              {urgentList.map((conv) => (
                <Link
                  key={conv.phone}
                  href="/conversations"
                  className="flex items-center justify-between rounded-lg bg-card/50 px-3 py-2 transition-colors hover:bg-card"
                >
                  <p className="truncate text-sm font-medium">
                    {conv.display_name ||
                      conv.phone.replace("@s.whatsapp.net", "")}
                  </p>
                  <span className="shrink-0 rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                    aguardando
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Últimas conversas */}
        <div className="mt-6 rounded-xl border border-border bg-card p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Últimas conversas</h3>
            {list.length > 0 && (
              <Link
                href="/conversations"
                className="text-xs text-primary hover:underline"
              >
                Ver inbox
              </Link>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-14 animate-pulse rounded-lg border border-border bg-muted/30"
                />
              ))}
            </div>
          ) : list.length === 0 ? (
            <EmptyState
              icon={MessageCircle}
              title="Nenhuma conversa ainda"
              description="Conecte o WhatsApp e as mensagens dos seus clientes vão aparecer aqui automaticamente com funil, score e histórico."
              actions={[
                { label: "Conectar WhatsApp", href: "/channels", icon: Radio },
              ]}
              compact
            />
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

// ─── Componente KPI ─────────────────────────────────────
type KpiCardProps = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  color: string;
  bg: string;
  alert?: boolean;
};

function KpiCard({ icon: Icon, label, value, color, bg, alert }: KpiCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="h-4 w-4" />
          <p className="text-xs">{label}</p>
        </div>
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${bg}`}>
          <Icon className={`h-3.5 w-3.5 ${color}`} />
        </div>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        {alert && (
          <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
            ação
          </span>
        )}
      </div>
    </div>
  );
}