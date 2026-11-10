"use client";

import { Header } from "@/components/layout/header";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAgents, publishAgent, archiveAgent, deleteAgent, type Agent } from "@/lib/agents-api";
import { useApiMutation } from "@/lib/use-api-mutation";
import { Bot, Plus, Pencil, Trash2, Rocket, Archive } from "lucide-react";
import Link from "next/link";

export default function AgentsPage() {
  const qc = useQueryClient();
  const { data: agents = [], isLoading } = useQuery({
    queryKey: ["agents"],
    queryFn: () => getAgents(),
  });

  const pubMut = useApiMutation({
    mutationFn: (id: number) => publishAgent(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agents"] }),
    successMessage: "Agente publicado",
  });
  const archMut = useApiMutation({
    mutationFn: (id: number) => archiveAgent(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agents"] }),
    successMessage: "Agente arquivado",
  });
  const delMut = useApiMutation({
    mutationFn: (id: number) => deleteAgent(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agents"] }),
    successMessage: "Agente excluído",
  });

  const statusStyle: Record<string, string> = {
    draft: "bg-secondary text-muted-foreground",
    published: "bg-emerald-500/15 text-emerald-400",
    archived: "bg-amber-500/15 text-amber-300",
  };

  return (
    <>
      <Header title="Agentes" subtitle="1 agente de IA por produto — Agent Builder" />
      <div className="page-scroll page-pad space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {isLoading ? "..." : `${agents.length} agente(s)`}
          </p>
          <Link
            href="/agents/new"
            className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
          >
            <Plus className="h-4 w-4" /> Criar agente
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading && (
            <div className="col-span-full py-12 text-center text-muted-foreground">Carregando...</div>
          )}
          {!isLoading && agents.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-border py-16 text-center">
              <Bot className="mx-auto mb-3 h-10 w-10 opacity-40" />
              <p className="text-muted-foreground">Nenhum agente ainda</p>
              <Link href="/agents/new" className="mt-3 inline-block text-sm text-primary hover:underline">
                Criar o primeiro agente
              </Link>
            </div>
          )}
          {agents.map((a: Agent) => (
            <div key={a.id} className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold">{a.name}</h3>
                  <p className="truncate text-xs text-muted-foreground">
                    Produto: {a.produto_nome || a.produto_id}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusStyle[a.status] || statusStyle.draft}`}>
                  {a.status}
                </span>
              </div>
              {a.description && (
                <p className="line-clamp-2 text-xs text-muted-foreground">{a.description}</p>
              )}
              <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
                <Link
                  href={`/agents/${a.id}`}
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs hover:bg-secondary"
                >
                  <Pencil className="h-3 w-3" /> Editar
                </Link>
                {a.status !== "published" && (
                  <button
                    onClick={() => pubMut.mutate(a.id)}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 px-2 py-1 text-xs text-emerald-400"
                  >
                    <Rocket className="h-3 w-3" /> Publicar
                  </button>
                )}
                {a.status === "published" && (
                  <button
                    onClick={() => archMut.mutate(a.id)}
                    className="inline-flex items-center gap-1 rounded-lg bg-amber-500/15 px-2 py-1 text-xs text-amber-300"
                  >
                    <Archive className="h-3 w-3" /> Arquivar
                  </button>
                )}
                <button
                  onClick={() => {
                    if (confirm("Excluir este agente?")) delMut.mutate(a.id);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground hover:text-rose-400"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
