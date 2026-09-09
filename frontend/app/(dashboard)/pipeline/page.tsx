"use client";

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

export default function PipelinePage() {
  const qc = useQueryClient();
  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => getConversations(),
    refetchInterval: 8000,
  });

  const list = Array.isArray(conversations) ? conversations : [];

  const moveMut = useMutation({
    mutationFn: ({ phone, step }: { phone: string; step: string }) =>
      updateStep(phone, step),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversations"] }),
  });

  const byStep = FUNNEL_STEPS.map((s) => ({
    ...s,
    items: list.filter((c) => (c.current_step || "inicio") === s.id),
  }));

  return (
    <>
      <Header
        title="Pipeline"
        subtitle="Kanban vivo — arraste a etapa pelos botoes ou avance no atendimento"
      />
      <div className="flex-1 overflow-x-auto p-6">
        {isLoading && (
          <p className="text-sm text-muted-foreground">Carregando funil...</p>
        )}
        <div className="flex min-w-max gap-4">
          {byStep.map((col) => (
            <div key={col.id} className="w-64 shrink-0">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium">{col.label}</span>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                  {col.items.length}
                </span>
              </div>
              <div className="min-h-[420px] space-y-2 rounded-xl border border-dashed border-border bg-muted/30 p-2">
                {col.items.map((lead) => (
                  <div
                    key={lead.phone}
                    className="rounded-lg border border-border bg-card p-3 shadow-sm"
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
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[10px] text-primary">
                        score {lead.lead_score ?? 0}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {FUNNEL_STEPS.filter((s) => s.id !== col.id)
                        .slice(0, 3)
                        .map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            disabled={moveMut.isPending}
                            onClick={() =>
                              moveMut.mutate({ phone: lead.phone, step: s.id })
                            }
                            className={cn(
                              "rounded px-1.5 py-0.5 text-[10px] border border-border hover:bg-secondary"
                            )}
                          >
                            → {s.label}
                          </button>
                        ))}
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
          ))}
        </div>
      </div>
    </>
  );
}
