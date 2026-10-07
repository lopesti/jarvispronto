"use client";

import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import { Header } from "@/components/layout/header";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiMutation } from "@/lib/use-api-mutation";
import {
  getTicket,
  replyToTicket,
  statusLabel,
  statusColor,
  type SupportMessage,
} from "@/lib/support-api";
import Link from "next/link";
import { ArrowLeft, Send } from "lucide-react";

export default function TicketPage() {
  const params = useParams();
  const id = String(params.id);
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["support-ticket", id],
    queryFn: () => getTicket(id),
    refetchInterval: 10000,
  });

  const mutation = useApiMutation({
    mutationFn: (body: string) => replyToTicket(id, body),
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["support-ticket", id] });
      qc.invalidateQueries({ queryKey: ["support-tickets"] });
    },
  });

  const handleSend = () => {
    if (!text.trim()) return;
    mutation.mutate(text.trim());
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [data?.messages?.length]);

  if (isLoading || !data) {
    return (
      <>
        <Header title="Chamado" />
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-3xl">
            <div className="h-96 animate-pulse rounded-xl border border-border bg-card" />
          </div>
        </div>
      </>
    );
  }

  const { ticket, messages } = data;

  return (
    <>
      <Header title={ticket.subject} subtitle={`Chamado #${ticket.id}`} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-hidden px-6 py-4">
          <div className="mb-4 flex items-center justify-between">
            <Link
              href="/support"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Link>
            <span
              className={`rounded-full border px-3 py-1 text-xs font-medium ${statusColor(
                ticket.status
              )}`}
            >
              {statusLabel(ticket.status)}
            </span>
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
                  className={`flex ${fromAdmin ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                      fromAdmin
                        ? "bg-secondary text-foreground"
                        : "bg-primary text-primary-foreground"
                    }`}
                  >
                    <div className="mb-1 text-xs font-medium opacity-70">
                      {fromAdmin ? "Suporte Jarvis" : "Você"}
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
                placeholder="Digite sua mensagem... (Enter envia, Shift+Enter quebra linha)"
                rows={2}
                className="flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <button
                onClick={handleSend}
                disabled={mutation.isPending || !text.trim()}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                Enviar
              </button>
            </div>
          )}

          {ticket.status === "closed" && (
            <div className="mt-4 rounded-lg border border-border bg-muted p-3 text-center text-sm text-muted-foreground">
              Este chamado foi fechado.
            </div>
          )}
        </div>
      </div>
    </>
  );
}