"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { useApiMutation } from "@/lib/use-api-mutation";
import { createTicket } from "@/lib/support-api";
import { ArrowLeft, Send } from "lucide-react";
import Link from "next/link";

export default function NewTicketPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    subject: "",
    body: "",
    category: "bug",
    priority: "normal",
  });

  const mutation = useApiMutation({
    mutationFn: createTicket,
    successMessage: "Chamado aberto com sucesso!",
    onSuccess: (ticket: any) => {
      router.push(`/support/${ticket.id}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.body.trim()) return;
    mutation.mutate(form);
  };

  return (
    <>
      <Header
        title="Novo chamado"
        subtitle="Descreva o problema ou dúvida e enviaremos ao time Jarvis"
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl">
          <Link
            href="/support"
            className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>

          <form
            onSubmit={handleSubmit}
            className="space-y-5 rounded-xl border border-border bg-card p-6"
          >
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Assunto <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={200}
                value={form.subject}
                onChange={(e) =>
                  setForm((f) => ({ ...f, subject: e.target.value }))
                }
                placeholder="Ex: Erro ao conectar WhatsApp"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Categoria
                </label>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, category: e.target.value }))
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                >
                  <option value="bug">Bug / Erro</option>
                  <option value="billing">Cobrança</option>
                  <option value="feature">Sugestão</option>
                  <option value="question">Dúvida</option>
                  <option value="other">Outro</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Prioridade
                </label>
                <select
                  value={form.priority}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, priority: e.target.value }))
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                >
                  <option value="low">Baixa</option>
                  <option value="normal">Normal</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Descrição <span className="text-destructive">*</span>
              </label>
              <textarea
                required
                rows={8}
                value={form.body}
                onChange={(e) =>
                  setForm((f) => ({ ...f, body: e.target.value }))
                }
                placeholder="Descreva com detalhes o que aconteceu..."
                className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Link
                href="/support"
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-secondary"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={mutation.isPending || !form.subject || !form.body}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {mutation.isPending ? "Enviando..." : "Abrir chamado"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}