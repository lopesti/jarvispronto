"use client";

import { Header } from "@/components/layout/header";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createAutomation, getAutomations } from "@/lib/api";
import { EmptyState } from "@/components/ui/empty-state";
import { useState } from "react";
import { Plus, Zap } from "lucide-react";

export default function AutomationsPage() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["automations"],
    queryFn: getAutomations,
  });
  const [name, setName] = useState("Lead quente → avisar time");

  const create = useMutation({
    mutationFn: () =>
      createAutomation({
        name,
        trigger_type: "score_gte",
        trigger_config: { score: 70 },
        action_type: "notify",
        action_config: { channel: "panel" },
        enabled: true,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["automations"] });
    },
  });

  return (
    <>
      <Header
        title="Automações"
        subtitle="Regras simples de funil · score, etapa e handoff"
      />
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mb-6 rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold">Nova automação rápida</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Exemplo: se score ≥ 70, notificar no painel (expandiremos ações em breve).
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm"
              placeholder="Nome da automação"
            />
            <button
              type="button"
              disabled={create.isPending || !name.trim()}
              onClick={() => create.mutate()}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" /> Criar
            </button>
          </div>
        </div>

        {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}

        {!isLoading && data.length === 0 && (
          <EmptyState
            icon={Zap}
            title="Nenhuma automação ainda"
            description="Crie regras para notificar o time quando o lead esquentar."
          />
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((a) => (
            <div key={a.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-sm font-semibold">{a.name}</h4>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    a.enabled
                      ? "bg-primary/15 text-primary"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {a.enabled ? "Ativa" : "Pausada"}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Se <strong>{a.trigger_type}</strong> → <strong>{a.action_type}</strong>
              </p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
