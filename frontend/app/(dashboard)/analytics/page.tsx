"use client";

import { Header } from "@/components/layout/header";

export default function AnalyticsPage() {
  return (
    <>
      <Header title="Analytics" subtitle="Métricas e insights de performance" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="text-sm font-medium">Taxa de conversão por etapa</h3>
            <div className="mt-4 flex h-48 items-center justify-center text-sm text-muted-foreground">
              Gráfico de barras — conecte /api/pipeline
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="text-sm font-medium">Volume de mensagens</h3>
            <div className="mt-4 flex h-48 items-center justify-center text-sm text-muted-foreground">
              Gráfico de área — conecte /api/stats
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="text-sm font-medium">Tempo médio de resposta</h3>
            <div className="mt-4 flex h-48 items-center justify-center text-sm text-muted-foreground">
              Em breve
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="text-sm font-medium">Receita por período</h3>
            <div className="mt-4 flex h-48 items-center justify-center text-sm text-muted-foreground">
              Em breve
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
