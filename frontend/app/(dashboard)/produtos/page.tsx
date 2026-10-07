"use client";

import { Header } from "@/components/layout/header";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiMutation } from "@/lib/use-api-mutation";
import {
  getProdutos,
  createProduto,
  updateProduto,
  deleteProduto,
  type Produto,
} from "@/lib/api";
import { EmptyState } from "@/components/ui/empty-state";
import { Package, Plus, Pencil, Trash2, X } from "lucide-react";

const emptyForm = { nome: "", descricao: "", preco: "", estoque: "0" };

export default function ProdutosPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");

  const { data: produtos = [], isLoading } = useQuery({
    queryKey: ["produtos"],
    queryFn: getProdutos,
  });

  const list = Array.isArray(produtos) ? produtos : [];

  const saveMut = useApiMutation({
    mutationFn: async () => {
      const payload = {
        nome: form.nome.trim(),
        descricao: form.descricao.trim(),
        preco: Number(form.preco),
        estoque: Number(form.estoque || 0),
      };
      if (!payload.nome || Number.isNaN(payload.preco)) {
        throw new Error("Nome e preco validos sao obrigatorios");
      }
      if (editingId) return updateProduto(editingId, payload);
      return createProduto(payload);
    },
    onSuccess: () => {
      setForm(emptyForm);
      setEditingId(null);
      setError("");
      setShowForm(false);
      qc.invalidateQueries({ queryKey: ["produtos"] });
    },
    onError: (e: any) => {
      setError(e?.message || "Erro ao salvar");
    },
    successMessage: "Produto salvo",
  });

  const delMut = useApiMutation({
    mutationFn: (id: number) => deleteProduto(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["produtos"] }),
    successMessage: "Produto excluido",
  });

  function openNew() {
    setForm(emptyForm);
    setEditingId(null);
    setError("");
    setShowForm(true);
  }

  function startEdit(p: Produto) {
    setEditingId(p.id);
    setForm({
      nome: p.nome || "",
      descricao: p.descricao || "",
      preco: String(p.preco ?? ""),
      estoque: String(p.estoque ?? 0),
    });
    setError("");
    setShowForm(true);
  }

  function closeForm() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setShowForm(false);
  }

  return (
    <>
      <Header title="Produtos" subtitle="Catalogo de produtos do tenant" />

      <div className="flex-1 overflow-y-auto p-6">
        {/* Barra de ações */}
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {isLoading
              ? "Carregando..."
              : `${list.length} ${list.length === 1 ? "produto" : "produtos"}`}
          </div>
          <button
            type="button"
            onClick={openNew}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Novo produto
          </button>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="h-12 animate-pulse bg-card/50" />
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 animate-pulse border-b border-border bg-card/30"
              />
            ))}
          </div>
        )}

        {/* Empty */}
        {!isLoading && list.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-card/50">
            <EmptyState
              icon={Package}
              title="Nenhum produto cadastrado"
              description="Cadastre seu primeiro produto para que a IA possa vende-lo no WhatsApp com preco e descricao corretos."
              actions={[
                { label: "Cadastrar produto", onClick: openNew, icon: Plus },
              ]}
            />
          </div>
        )}

        {/* Tabela */}
        {!isLoading && list.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-card text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">Preco</th>
                  <th className="px-4 py-3 font-medium">Estoque</th>
                  <th className="px-4 py-3 font-medium text-right">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {list.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-border hover:bg-secondary/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-muted-foreground">
                      #{p.id}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{p.nome}</div>
                      {p.descricao && (
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {p.descricao}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      R$ {Number(p.preco).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">{p.estoque ?? 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(p)}
                          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-secondary"
                        >
                          <Pencil className="h-3 w-3" />
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Excluir produto "${p.nome}"?`))
                              delMut.mutate(p.id);
                          }}
                          className="inline-flex items-center gap-1 rounded-md border border-red-500/40 px-2 py-1 text-xs text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-3 w-3" />
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={closeForm}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold">
                {editingId ? `Editar produto #${editingId}` : "Novo produto"}
              </h2>
              <button
                type="button"
                onClick={closeForm}
                className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {error && (
              <div className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Nome <span className="text-destructive">*</span>
                </label>
                <input
                  className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm outline-none focus:border-primary"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Ex: Escova Alisadora 3 em 1"
                  autoFocus
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Descricao
                </label>
                <textarea
                  className="w-full resize-none rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm outline-none focus:border-primary min-h-[72px]"
                  value={form.descricao}
                  onChange={(e) =>
                    setForm({ ...form, descricao: e.target.value })
                  }
                  placeholder="Detalhes, beneficios, diferenciais..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">
                    Preco (R$) <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm outline-none focus:border-primary"
                    value={form.preco}
                    onChange={(e) =>
                      setForm({ ...form, preco: e.target.value })
                    }
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">
                    Estoque
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm outline-none focus:border-primary"
                    value={form.estoque}
                    onChange={(e) =>
                      setForm({ ...form, estoque: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeForm}
                className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-secondary"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={saveMut.isPending}
                onClick={() => saveMut.mutate()}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {saveMut.isPending
                  ? "Salvando..."
                  : editingId
                    ? "Atualizar"
                    : "Criar produto"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}