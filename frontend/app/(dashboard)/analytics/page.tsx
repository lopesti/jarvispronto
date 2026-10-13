"use client";

import { useQuery } from "@tanstack/react-query";
import { getFunnelAnalytics } from "@/lib/api";
import { api } from "@/lib/api";

type Stats = {
  totalConversations?: number;
  totalMessages?: number;
  needsHuman?: number;
  avgScore?: number;
};

export default function AnalyticsPage() {
  const funnel = useQuery({
    queryKey: ["analytics-funnel"],
    queryFn: getFunnelAnalytics,
  });

  const stats = useQuery({
    queryKey: ["conversations-stats"],
    queryFn: async () => {
      const { data } = await api.get("/api/conversations/stats");
      return data as Stats;
    },
  });

  const steps = funnel.data?.steps || [];
  const maxTotal = Math.max(1, ...steps.map((s) => s.total || 0));
  const totalLeads = funnel.data?.total ?? steps.reduce((a, s) => a + (s.total || 0), 0);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Analytics</h1>
          <p className="text-sm text-muted-foreground">Funil e volume a partir dos dados reais da sua empresa</p>
        </div>
      </div>

      <div className="page-scroll page-pad">
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <Metric label="Leads no funil" value={funnel.isLoading ? "…" : String(totalLeads)} />
          <Metric
            label="Conversas"
            value={stats.isLoading ? "…" : String(stats.data?.totalConversations ?? "—")}
          />
          <Metric
            label="Aguardando humano"
            value={stats.isLoading ? "…" : String(stats.data?.needsHuman ?? "—")}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card card-pad">
            <h3 className="text-sm font-medium">Funil por etapa</h3>
            {funnel.isLoading ? (
              <p className="mt-6 text-sm text-muted-foreground">Carregando…</p>
            ) : funnel.isError ? (
              <p className="mt-6 text-sm text-destructive">Não foi possível carregar o funil.</p>
            ) : steps.length === 0 ? (
              <p className="mt-6 text-sm text-muted-foreground">Sem dados de etapa ainda.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {steps.map((s) => {
                  const pct = Math.round(((s.total || 0) / maxTotal) * 100);
                  return (
                    <div key={s.step}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-medium capitalize">{s.step || "—"}</span>
                        <span className="text-muted-foreground">
                          {s.total} · score médio {Number(s.avg_score || 0).toFixed(0)}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      {s.pipeline_value > 0 && (
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          Pipeline: R$ {Number(s.pipeline_value).toLocaleString("pt-BR")}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card card-pad">
            <h3 className="text-sm font-medium">Resumo operacional</h3>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>
                Mensagens registradas:{" "}
                <span className="font-medium text-foreground">
                  {stats.data?.totalMessages ?? "—"}
                </span>
              </li>
              <li>
                Etapas distintas no funil:{" "}
                <span className="font-medium text-foreground">{steps.length}</span>
              </li>
              <li>
                Valor total em pipeline:{" "}
                <span className="font-medium text-foreground">
                  R${" "}
                  {steps
                    .reduce((a, s) => a + (Number(s.pipeline_value) || 0), 0)
                    .toLocaleString("pt-BR")}
                </span>
              </li>
            </ul>
            <p className="mt-6 text-xs text-muted-foreground">
              Fonte: <code className="text-[11px]">GET /api/crm/analytics/funnel</code> e{" "}
              <code className="text-[11px]">GET /api/conversations/stats</code>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
    </div>
  );
}
