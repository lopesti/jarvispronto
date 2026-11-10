"use client";

import { Header } from "@/components/layout/header";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createAgent, getAgentTemplates } from "@/lib/agents-api";
import { getProdutos } from "@/lib/api";
import { useApiMutation } from "@/lib/use-api-mutation";
import { useRouter, useSearchParams } from "next/navigation";
import { Bot } from "lucide-react";

export default function NewAgentPage() {
  const router = useRouter();
  const search = useSearchParams();
  const preProduto = search.get("produto_id") || "";
  const qc = useQueryClient();

  const [produtoId, setProdutoId] = useState(preProduto);
  const [template, setTemplate] = useState("vendas");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const { data: produtos = [] } = useQuery({ queryKey: ["produtos"], queryFn: getProdutos });
  const { data: templates = [] } = useQuery({ queryKey: ["agent-templates"], queryFn: getAgentTemplates });

  const createMut = useApiMutation({
    mutationFn: () =>
      createAgent({
        produto_id: Number(produtoId),
        name: name || undefined,
        description: description || undefined,
        template_key: template,
        channels: ["whatsapp"],
      }),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["agents"] });
      const id = res?.agent?.id;
      if (id) router.push(`/agents/${id}`);
      else router.push("/agents");
    },
    successMessage: "Agente criado",
  });

  return (
    <>
      <Header title="Novo Agente" subtitle="Vincule um agente de IA a um produto" />
      <div className="page-scroll page-pad max-w-xl space-y-4">
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Bot className="h-4 w-4 text-primary" />
            1 agente por produto — o conhecimento (preço, estoque, descrição) é carregado automaticamente
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Produto *</label>
            <select
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={produtoId}
              onChange={(e) => setProdutoId(e.target.value)}
            >
              <option value="">Selecione o produto...</option>
              {(Array.isArray(produtos) ? produtos : []).map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.nome} — R$ {Number(p.preco).toFixed(2)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Template</label>
            <select
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
            >
              {(templates.length ? templates : [
                { key: "vendas", name_suffix: "Vendas" },
                { key: "suporte", name_suffix: "Suporte" },
                { key: "qualificacao", name_suffix: "Qualificação" },
                { key: "pos_venda", name_suffix: "Pós-venda" },
                { key: "custom", name_suffix: "Custom" },
              ]).map((t: any) => (
                <option key={t.key} value={t.key}>{t.name_suffix || t.key}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Nome do agente (opcional)</label>
            <input
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              placeholder="Ex: Assistente Troca de Óleo"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Descrição (opcional)</label>
            <textarea
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => createMut.mutate()}
              disabled={!produtoId || createMut.isPending}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {createMut.isPending ? "Criando..." : "Criar e abrir builder"}
            </button>
            <button
              onClick={() => router.push("/agents")}
              className="rounded-lg border border-border px-4 py-2 text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
