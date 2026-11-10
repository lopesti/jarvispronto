"use client";

import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiMutation } from "@/lib/use-api-mutation";
import {
  adminGetTicket,
  adminReply,
  adminAssign,
  adminSetStatus,
  statusLabel,
  statusColor,
  priorityLabel,
  type SupportMessage,
} from "@/lib/support-api";
import Link from "next/link";
import { ArrowLeft, Send, UserCheck } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "open", label: "Aberto" },
  { value: "waiting", label: "Aguardando cliente" },
  { value: "resolved", label: "Resolvido" },
  { value: "closed", label: "Fechado" },
];

export default function AdminTicketPage() {
  const params = useParams();
  const id = String(params.id);
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-support-ticket", id],
    queryFn: () => adminGetTicket(id),
    refetchInterval: 10000,
  });

  const replyMut = useApiMutation({
    mutationFn: (body: string) => adminReply(id, body),
    successMessage: "Resposta enviada",
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["admin-support-ticket", id] });
      qc.invalidateQueries({ queryKey: ["admin-support-tickets"] });
    },
  });

  const assignMut = useApiMutation({
    mutationFn: () => adminAssign(id),
    successMessage: "Chamado atribuido a voce",
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-support-ticket", id] });
      qc.invalidateQueries({ queryKey: ["admin-support-tickets"] });
    },
  });

  const statusMut = useApiMutation({
    mutationFn: (status: string) => adminSetStatus(id, status),
    successMessage: "Status atualizado",
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-support-ticket", id] });
      qc.invalidateQueries({ queryKey: ["admin-support-tickets"] });
    },
  });

  const handleSend = () => {
    if (!text.trim()) return;
    replyMut.mutate(text.trim());
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [data?.messages?.length]);

  if (isLoading || !data) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-sm text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  const { ticket, messages } = data;

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-border px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/support"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
          <div className="h-6 w-px bg-border" />
          <div>
            <h1 className="text-sm font-semibold">{ticket.subject}</h1>
            <p className="text-xs text-muted-foreground">
              #{ticket.id} - {ticket.company_name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={ticket.status}
            onChange={(e) => statusMut.mutate(e.target.value)}
            disabled={statusMut.isPending}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs outline-none focus:border-primary"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          <button
            onClick={() => assignMut.mutate()}
            disabled={assignMut.isPending || !!ticket.assigned_to}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-secondary disabled:opacity-50"
          >
            <UserCheck className="h-3.5 w-3.5" />
            {ticket.assigned_to ? "Atribuido" : "Atribuir a mim"}
          </button>

          <span
            className={`rounded-full border px-3 py-1.5 text-xs font-medium ${statusColor(
              ticket.status
            )}`}
          >
            {statusLabel(ticket.status)}
          </span>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-hidden px-6 py-4">
        <div className="mb-4 grid grid-cols-3 gap-3 text-xs">
          <div className="rounded-lg border border-border bg-card px-3 py-2">
            <div className="text-muted-foreground">Prioridade</div>
            <div className="font-medium">{priorityLabel(ticket.priority)}</div>
          </div>
          <div className="rounded-lg border border-border bg-card px-3 py-2">
            <div className="text-muted-foreground">Categoria</div>
            <div className="font-medium capitalize">{ticket.category || "Geral"}</div>
          </div>
          <div className="rounded-lg border border-border bg-card px-3 py-2">
            <div className="text-muted-foreground">Atribuido</div>
            <div className="font-medium">
              {ticket.assigned_to ? `User #${ticket.assigned_to}` : "Ninguem"}
            </div>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 space-y-4 overflow-y-auto rounded-xl border border-border bg-card p-4"
        >
          {messages.map((m: SupportMessage) => {
            const fromAdmin = m.is_from_admin;
            return (
              <div
                key={m.id}
                className={`flex ${fromAdmin ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                    fromAdmin
                      ? "bg-red-500/15 text-foreground border border-red-500/20"
                      : "bg-secondary text-foreground"
                  }`}
                >
                  <div className="mb-1 text-xs font-medium opacity-70">
                    {fromAdmin ? "Voce (Admin)" : `${m.author_name} (Cliente)`}
                  </div>
                  <div className="whitespace-pre-wrap text-sm">{m.body}</div>
                  <div className="mt-1 text-[10px] opacity-60">
                    {new Date(m.created_at).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {ticket.status !== "closed" && (
          <div className="mt-4 flex items-end gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Responder como admin... (Enter envia, Shift+Enter quebra linha)"
              rows={2}
              className="flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <button
              onClick={handleSend}
              disabled={replyMut.isPending || !text.trim()}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-red-500 px-4 text-sm font-medium text-white hover:bg-red-500/90 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              Responder
            </button>
          </div>
        )}

        {ticket.status === "closed" && (
          <div className="mt-4 rounded-lg border border-border bg-muted p-3 text-center text-sm text-muted-foreground">
            Chamado fechado.
          </div>
        )}
      </div>
    </>
  );
}