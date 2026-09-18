"use client";

import { Header } from "@/components/layout/header";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getProdutos,
  createProduto,
  updateProduto,
  deleteProduto,
  type Produto,
} from "@/lib/api";

const emptyForm = { nome: "", descricao: "", preco: "", estoque: "0" };

export default function ProdutosPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const { data: produtos = [], isLoading } = useQuery({
    queryKey: ["produtos"],
    queryFn: getProdutos,
  });

  const list = Array.isArray(produtos) ? produtos : [];

  const saveMut = useMutation({
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
      qc.invalidateQueries({ queryKey: ["produtos"] });
    },
    onError: (e: Error) => setError(e.message || "Erro ao salvar"),
  });

  const delMut = useMutation({
    mutationFn: (id: number) => deleteProduto(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["produtos"] }),
  });

  function startEdit(p: Produto) {
    setEditingId(p.id);
    setForm({
      nome: p.nome || "",
      descricao: p.descricao || "",
      preco: String(p.preco ?? ""),
      estoque: String(p.estoque ?? 0),
    });
    setError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  }

  return (
    <>
      <Header
        title="Produtos"
        subtitle="CRUD completo — Criar, Consultar, Atualizar e Excluir"
      />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-sm font-semibold mb-4">
            {editingId ? `Editar produto #${editingId}` : "Novo produto"}
          </h2>
          {error && (
            <div className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-muted-foreground">Nome *</label>
              <input
                className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Ex: Escova Alisadora 3 em 1 — Kit 1"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-muted-foreground">Descricao</label>
              <textarea
                className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm min-h-[72px]"
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Preco (R$) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm"
                value={form.preco}
                onChange={(e) => setForm({ ...form, preco: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Estoque</label>
              <input
                type="number"
                min="0"
                className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm"
                value={form.estoque}
                onChange={(e) => setForm({ ...form, estoque: e.target.value })}
              />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saveMut.isPending}
              onClick={() => saveMut.mutate()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {editingId ? "Atualizar" : "Criar produto"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-secondary"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border overflow-hidden">
          <div className="border-b border-border bg-card px-4 py-3 text-sm font-medium">
            Lista de produtos {isLoading ? "(carregando...)" : `(${list.length})`}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Preco</th>
                <th className="px-4 py-3 font-medium">Estoque</th>
                <th className="px-4 py-3 font-medium">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhum produto cadastrado.
                  </td>
                </tr>
              )}
              {list.map((p) => (
                <tr key={p.id} className="border-b border-border hover:bg-secondary/30">
                  <td className="px-4 py-3">{p.id}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{p.nome}</div>
                    {p.descricao && (
                      <div className="text-xs text-muted-foreground line-clamp-1">{p.descricao}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">R$ {Number(p.preco).toFixed(2)}</td>
                  <td className="px-4 py-3">{p.estoque ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(p)}
                        className="rounded border border-border px-2 py-1 text-xs hover:bg-secondary"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Excluir produto #${p.id}?`)) delMut.mutate(p.id);
                        }}
                        className="rounded border border-red-500/40 px-2 py-1 text-xs text-red-400 hover:bg-red-500/10"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
