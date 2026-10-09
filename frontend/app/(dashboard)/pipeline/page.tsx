"use client";

import { useEffect, useRef } from "react";
import { Header } from "@/components/layout/header";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiMutation } from "@/lib/use-api-mutation";
import { EmptyState } from "@/components/ui/empty-state";
import {
  getConversations,
  updateStep,
  FUNNEL_STEPS,
  type Conversation,
} from "@/lib/api";
import { GitBranch, Radio, MessageSquare } from "lucide-react";
import Link from "next/link";

function shortName(c: Conversation) {
  if (c.display_name) return c.display_name;
  return c.phone
    .replace("@s.whatsapp.net", "")
    .replace(/^instagram:/, "IG ")
    .replace(/^facebook:/, "FB ");
}

function getTargetStepByScore(score: number = 0): string {
  if (score >= 100) return "vendido";
  if (score >= 80) return "fechamento";
  if (score >= 55) return "interesse";
  if (score >= 45) return "objecao";
  if (score >= 30) return "qualificacao";
  if (score <= 0) return "perdido";
  return "inicio";
}

// Cores por etapa (borda superior + header)
const STEP_COLORS: Record<string, { border: string; badge: string }> = {
  inicio:       { border: "border-t-slate-500",   badge: "bg-slate-500/15 text-slate-300" },
  qualificacao: { border: "border-t-blue-500",    badge: "bg-blue-500/15 text-blue-300" },
  interesse:    { border: "border-t-cyan-500",    badge: "bg-cyan-500/15 text-cyan-300" },
  objecao:      { border: "border-t-amber-500",   badge: "bg-amber-500/15 text-amber-300" },
  fechamento:   { border: "border-t-orange-500",  badge: "bg-orange-500/15 text-orange-300" },
  vendido:      { border: "border-t-emerald-500", badge: "bg-emerald-500/15 text-emerald-300" },
  perdido:      { border: "border-t-red-500",     badge: "bg-red-500/15 text-red-300" },
};

export default function PipelinePage() {
  const qc = useQueryClient();

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => getConversations(),
    refetchInterval: 5000,
  });

  const list = Array.isArray(conversations) ? conversations : [];

  const moveMut = useApiMutation({
    mutationFn: ({ phone, step }: { phone: string; step: string }) =>
      updateStep(phone, step),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversations"] }),
  });

  const pendingUpdates = useRef<Set<string>>(new Set());
  const failedUpdates = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!list.length) return;

    list.forEach((lead) => {
      const targetStep = getTargetStepByScore(lead.lead_score);
      const currentStep = lead.current_step || "inicio";
      const key = `${lead.phone}:${targetStep}`;

      if (failedUpdates.current.has(key)) return;
      if (currentStep === targetStep) return;
      if (pendingUpdates.current.has(lead.phone)) return;

      pendingUpdates.current.add(lead.phone);

      moveMut.mutate(
        { phone: lead.phone, step: targetStep },
        {
          onSuccess: () => {
            pendingUpdates.current.delete(lead.phone);
          },
          onError: () => {
            pendingUpdates.current.delete(lead.phone);
            failedUpdates.current.add(key);
          },
        }
      );
    });
  }, [list, moveMut]);

  const byStep = FUNNEL_STEPS.map((s) => ({
    ...s,
    items: list.filter((c) => (c.current_step || "inicio") === s.id),
  }));

  const totalLeads = list.length;

  return (
    <>
      <Header
        title="Pipeline Automatico"
        subtitle="Movimentacao inteligente - as caixas mudam de coluna dinamicamente com base no score"
      />

      <div className="flex-1 overflow-auto p-6">
        {/* Loading */}
        {isLoading && (
          <div className="space-y-2">
            <div className="h-8 w-40 animate-pulse rounded-lg bg-card/50" />
            <div className="flex gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-96 w-64 shrink-0 animate-pulse rounded-xl border border-border bg-card/30"
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty state global */}
        {!isLoading && totalLeads === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-card/50">
            <EmptyState
              icon={GitBranch}
              title="Nenhum lead no funil"
              description="Quando alguem conversar no WhatsApp, os leads vao aparecer aqui e se mover pelas etapas automaticamente com base no score."
              actions={[
                { label: "Conectar WhatsApp", href: "/channels", icon: Radio },
                {
                  label: "Ver conversas",
                  href: "/conversations",
                  icon: MessageSquare,
                  variant: "secondary",
                },
              ]}
            />
          </div>
        )}

        {/* Kanban */}
        {!isLoading && totalLeads > 0 && (
          <div className="flex min-w-max gap-4">
            {byStep.map((col) => {
              const colors = STEP_COLORS[col.id] || STEP_COLORS.inicio;
              return (
                <div key={col.id} className="w-64 shrink-0">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-medium">{col.label}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors.badge}`}
                    >
                      {col.items.length}
                    </span>
                  </div>

                  <div
                    className={`min-h-[420px] space-y-2 rounded-xl border border-dashed border-border border-t-2 ${colors.border} bg-muted/30 p-2`}
                  >
                    {col.items.map((lead) => (
                      <div
                        key={lead.phone}
                        className="rounded-lg border border-border bg-card p-3 shadow-sm transition-all duration-300"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium leading-tight">
                            {shortName(lead)}
                          </p>
                          <span className="shrink-0 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] text-primary">
                            {lead.channel || "whatsapp"}
                          </span>
                        </div>

                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {lead.lastMessage || "-"}
                        </p>

                        <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                            Score: {lead.lead_score ?? 0}
                          </span>
                        </div>
                      </div>
                    ))}

                    {col.items.length === 0 && (
                      <p className="p-4 text-center text-xs text-muted-foreground">
                        Vazio
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}