"use client";

import { Header } from "@/components/layout/header";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiMutation } from "@/lib/use-api-mutation";
import {
  getConversations,
  getConversation,
  sendMessage,
  handoffConversation,
  claimConversation,
  releaseToBot,
  setBotMode,
  stepLabel,
  type Conversation,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import {
  MessageSquare,
  Radio,
  UserRound,
  Bot,
  HandMetal,
  Filter,
  Inbox,
  Users,
} from "lucide-react";
import Link from "next/link";

type ListFilter = "all" | "needs_human" | "mine";

function displayPhone(phone: string) {
  return phone
    .replace("@s.whatsapp.net", "")
    .replace("@lid", "")
    .replace(/^(instagram|facebook):/, "");
}

function channelIcon(channel?: string) {
  const ch = (channel || "whatsapp").toLowerCase().trim();
  if (ch.includes("instagram")) return "IG";
  if (ch.includes("facebook") || ch.includes("messenger")) return "FB";
  if (ch === "whatsapp" || ch === "wa") return "WA";
  if (!ch) return "WA";
  return ch.slice(0, 2).toUpperCase();
}

export default function ConversationsPage() {
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [filter, setFilter] = useState<ListFilter>("all");
  const qc = useQueryClient();

  const { data: chats = [], isLoading } = useQuery({
    queryKey: ["conversations", filter],
    queryFn: () => getConversations({ filter }),
    refetchInterval: 8000,
  });

  // Query secundaria pra contadores (pega TODAS as conversas)
  const { data: allChats = [] } = useQuery({
    queryKey: ["conversations-counts"],
    queryFn: () => getConversations({}),
    refetchInterval: 15000,
  });

  const list = Array.isArray(chats) ? chats : [];
  const allList = Array.isArray(allChats) ? allChats : [];
  const counts = {
    all: allList.length,
    needs_human: allList.filter((c) => c.needs_human).length,
    mine: allList.filter((c) => c.assigned_to).length,
  };

  const { data: detail, isLoading: loadingDetail } = useQuery({
    queryKey: ["conversation", selectedPhone],
    queryFn: async () => {
      if (!selectedPhone) return null;
      return await getConversation(selectedPhone);
    },
    enabled: !!selectedPhone,
    refetchInterval: 5000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["conversation", selectedPhone] });
    qc.invalidateQueries({ queryKey: ["conversations"] });
    qc.invalidateQueries({ queryKey: ["conversations-counts"] });
  };

  const sendMut = useApiMutation({
    mutationFn: async () => {
      if (!selectedPhone) return;
      return await sendMessage(selectedPhone, text);
    },
    onSuccess: () => {
      setText("");
      invalidate();
    },
    successMessage: "Mensagem enviada",
  });

  const handoffMut = useApiMutation({
    mutationFn: () => handoffConversation(selectedPhone!),
    onSuccess: invalidate,
    successMessage: "Conversa transferida para humano",
  });

  const claimMut = useApiMutation({
    mutationFn: () => claimConversation(selectedPhone!),
    onSuccess: invalidate,
    successMessage: "Voce assumiu a conversa",
  });

  const releaseMut = useApiMutation({
    mutationFn: () => releaseToBot(selectedPhone!),
    onSuccess: invalidate,
    successMessage: "Conversa devolvida ao bot",
  });

  const modeMut = useApiMutation({
    mutationFn: (mode: "full" | "hybrid" | "human") =>
      setBotMode(selectedPhone!, mode),
    onSuccess: invalidate,
    successMessage: "Modo do bot atualizado",
  });

  const messages = detail?.messages || [];
  const needsHuman = !!(detail?.needs_human ?? false);
  const step = detail?.current_step || "inicio";
  const score = Number(detail?.lead_score ?? 0);

  const filters: { id: ListFilter; label: string; count: number }[] = [
    { id: "all", label: "Todas", count: counts.all },
    { id: "needs_human", label: "Precisa humano", count: counts.needs_human },
    { id: "mine", label: "Minhas", count: counts.mine },
  ];

  return (
    <>
      <Header
        title="Conversas"
        subtitle="Inbox de vendas - funil + score + handoff"
      />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex w-80 flex-col border-r border-border">
          <div className="flex items-center gap-1 border-b border-border p-2">
            <Filter className="ml-1 h-3.5 w-3.5 text-muted-foreground" />
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setFilter(f.id);
                  setSelectedPhone(null);
                }}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                  filter === f.id
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:bg-secondary"
                )}
              >
                {f.label}
                {f.count > 0 && (
                  <span
                    className={cn(
                      "ml-1 rounded-full px-1.5 py-0.5 text-[9px]",
                      filter === f.id
                        ? "bg-primary/25 text-primary"
                        : "bg-secondary text-muted-foreground"
                    )}
                  >
                    {f.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading && (
              <div className="space-y-2 p-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-20 animate-pulse rounded-lg border border-border bg-card/30"
                  />
                ))}
              </div>
            )}

            {!isLoading && list.length === 0 && (
              <EmptyState
                icon={filter === "needs_human" ? Users : MessageSquare}
                title={
                  filter === "needs_human"
                    ? "Ninguem precisa de voce"
                    : filter === "mine"
                      ? "Nenhuma conversa sua"
                      : "Ainda nao ha sessao"
                }
                description={
                  filter === "needs_human"
                    ? "Quando uma conversa precisar de atendimento humano, ela aparece aqui."
                    : filter === "mine"
                      ? "Quando voce assumir uma conversa, ela vai aparecer aqui."
                      : "Apos conectar o WhatsApp, as mensagens dos clientes entram no funil automaticamente."
                }
                actions={
                  filter === "all"
                    ? [
                        {
                          label: "Conectar canal",
                          href: "/channels",
                          icon: Radio,
                        },
                      ]
                    : []
                }
                compact
              />
            )}

            {list.map((chat: Conversation) => (
              <button
                key={chat.phone}
                type="button"
                onClick={() => setSelectedPhone(chat.phone)}
                className={cn(
                  "flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-secondary/50",
                  selectedPhone === chat.phone && "bg-primary/10"
                )}
              >
                <div className="relative">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                    {displayPhone(chat.phone).slice(-2)}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 rounded bg-card px-0.5 text-[8px] font-bold text-muted-foreground border border-border">
                    {channelIcon(chat.channel)}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate text-sm font-medium">
                      {chat.display_name || displayPhone(chat.phone)}
                    </span>
                    {chat.needs_human && (
                      <span className="shrink-0 rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-amber-300">
                        humano
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {chat.lastMessage || "-"}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {stepLabel(chat.current_step)}
                    </span>
                    <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] text-primary">
                      score {chat.lead_score ?? 0}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-1 flex-col">
          {selectedPhone && detail ? (
            <>
              <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                  {displayPhone(selectedPhone).slice(-2)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {detail.display_name || displayPhone(selectedPhone)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {channelIcon(detail.channel)} - {stepLabel(step)} - score{" "}
                    {score}
                    {needsHuman ? " - aguardando humano" : ""}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <select
                    className="h-8 rounded-md border border-border bg-secondary/50 px-2 text-[11px]"
                    value={detail.bot_mode || "full"}
                    onChange={(e) =>
                      modeMut.mutate(
                        e.target.value as "full" | "hybrid" | "human"
                      )
                    }
                    title="Modo do bot"
                  >
                    <option value="full">Bot full</option>
                    <option value="hybrid">Hibrido</option>
                    <option value="human">So humano</option>
                  </select>

                  {!needsHuman ? (
                    <button
                      type="button"
                      onClick={() => handoffMut.mutate()}
                      disabled={handoffMut.isPending}
                      className="inline-flex h-8 items-center gap-1 rounded-md bg-amber-500/20 px-2.5 text-[11px] font-medium text-amber-200 hover:bg-amber-500/30"
                    >
                      <HandMetal className="h-3.5 w-3.5" />
                      Handoff
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => claimMut.mutate()}
                        disabled={claimMut.isPending}
                        className="inline-flex h-8 items-center gap-1 rounded-md bg-primary/20 px-2.5 text-[11px] font-medium text-primary hover:bg-primary/30"
                      >
                        <UserRound className="h-3.5 w-3.5" />
                        Assumir
                      </button>
                      <button
                        type="button"
                        onClick={() => releaseMut.mutate()}
                        disabled={releaseMut.isPending}
                        className="inline-flex h-8 items-center gap-1 rounded-md bg-secondary px-2.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                      >
                        <Bot className="h-3.5 w-3.5" />
                        Devolver ao bot
                      </button>
                    </>
                  )}
                </div>
              </div>

              {detail.handoff_summary && needsHuman && (
                <div className="border-b border-border bg-amber-500/5 px-4 py-2 text-[11px] text-muted-foreground whitespace-pre-wrap max-h-28 overflow-y-auto">
                  <span className="font-medium text-amber-200/90">
                    Resumo do handoff
                  </span>
                  {"\n"}
                  {detail.handoff_summary}
                </div>
              )}

              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {loadingDetail && (
                  <p className="text-sm text-muted-foreground">
                    Carregando mensagens...
                  </p>
                )}
                {messages.map((m, i) => (
                  <div
                    key={m.id ?? i}
                    className={cn(
                      "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm",
                      m.role === "assistant" || m.direction === "outgoing"
                        ? "rounded-bl-sm bg-primary/20"
                        : "ml-auto rounded-br-sm bg-secondary"
                    )}
                  >
                    {m.content}
                  </div>
                ))}
              </div>

              <div className="border-t border-border p-4">
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!text.trim() || sendMut.isPending) return;
                    sendMut.mutate();
                  }}
                >
                  <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Responder como humano..."
                    className="flex-1 rounded-lg border border-border bg-secondary/50 px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="submit"
                    disabled={sendMut.isPending || !text.trim()}
                    className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                  >
                    Enviar
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center">
              {list.length === 0 && filter === "all" ? (
                <EmptyState
                  icon={Inbox}
                  title="Nenhuma conversa ainda"
                  description="Conecte o WhatsApp e as mensagens dos seus clientes vao aparecer aqui automaticamente com funil, score e historico."
                  actions={[
                    { label: "Conectar WhatsApp", href: "/channels", icon: Radio },
                  ]}
                />
              ) : (
                <EmptyState
                  icon={MessageSquare}
                  title="Selecione uma conversa"
                  description="Escolha uma conversa na lista a esquerda para ver o historico e responder."
                  compact
                />
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}