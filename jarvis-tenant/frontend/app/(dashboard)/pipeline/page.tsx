"use client";

import { useEffect, useRef } from "react";
import { Header } from "@/components/layout/header";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getConversations,
  updateStep,
  FUNNEL_STEPS,
  type Conversation,
} from "@/lib/api";
import { cn } from "@/lib/utils";

function shortName(c: Conversation) {
  if (c.display_name) return c.display_name;
  return c.phone
    .replace("@s.whatsapp.net", "")
    .replace(/^instagram:/, "IG ")
    .replace(/^facebook:/, "FB ");
}

/**
 * 1. REGRA AUTOMÁTICA DE SCORE:
 * Mapeie as faixas de score para os IDs de FUNNEL_STEPS da sua API
 */
function getTargetStepByScore(score: number = 0): string {
  if (score >= 80) return "fechamento"; // ex: Score 80+
  if (score >= 50) return "proposta";   // ex: Score 50 a 79
  if (score >= 30) return "qualificado"; // ex: Score 30 a 49
  return "inicio";                       // ex: Score 0 a 29
}

export default function PipelinePage() {
  const qc = useQueryClient();

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => getConversations(),
    refetchInterval: 5000, // Busca novidades a cada 5 segundos
  });

  const list = Array.isArray(conversations) ? conversations : [];

  const moveMut = useMutation({
    mutationFn: ({ phone, step }: { phone: string; step: string }) =>
      updateStep(phone, step),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversations"] }),
  });

  // Evita re-disparar atualizações simultâneas do mesmo telefone
  const pendingUpdates = useRef<Set<string>>(new Set());

  // 2. VERIFICAÇÃO AUTOMÁTICA E TRANSIÇÃO DE ETAPA
  useEffect(() => {
    if (!list.length) return;

    list.forEach((lead) => {
      const targetStep = getTargetStepByScore(lead.lead_score);
      const currentStep = lead.current_step || "inicio";

      // Se a etapa atual for diferente da etapa calculada pelo score
      if (currentStep !== targetStep && !pendingUpdates.current.has(lead.phone)) {
        pendingUpdates.current.add(lead.phone);

        moveMut.mutate(
          { phone: lead.phone, step: targetStep },
          {
            onSettled: () => {
              pendingUpdates.current.delete(lead.phone);
            },
          }
        );
      }
    });
  }, [list, moveMut]);

  // Agrupa os leds por etapa já calculada
  const byStep = FUNNEL_STEPS.map((s) => ({
    ...s,
    items: list.filter((c) => (c.current_step || "inicio") === s.id),
  }));

  return (
    <>
      <Header
        title="Pipeline Automático"
        subtitle="Movimentação inteligente — as caixas mudam de coluna dinamicamente com base no score"
      />
      <div className="flex-1 overflow-x-auto p-6">
        {isLoading && (
          <p className="mb-4 text-sm text-muted-foreground">Carregando funil...</p>
        )}

        <div className="flex min-w-max gap-4">
          {byStep.map((col) => (
            <div key={col.id} className="w-64 shrink-0">
              {/* Cabeçalho da Coluna */}
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium">{col.label}</span>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                  {col.items.length}
                </span>
              </div>

              {/* Lista de Cards */}
              <div className="min-h-[420px] space-y-2 rounded-xl border border-dashed border-border bg-muted/30 p-2">
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
                      {lead.lastMessage || "—"}
                    </p>

                    <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2">
                      {/* Destaque visual do Score que rege a posição do card */}
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                        🔥 Score: {lead.lead_score ?? 0}
                      </span>
                    </div>
                  </div>
                ))}

                {col.items.length === 0 && (
                  <p className="p-4 text-center text-xs text-muted-foreground">
                    Nenhum lead nesta etapa
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
