"use client";

import { Header } from "@/components/layout/header";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getConversations,
  getConversation,
  sendMessage,
  type Conversation,
} from "@/lib/api";
import { cn } from "@/lib/utils";

function displayPhone(phone: string) {
  return phone.replace("@s.whatsapp.net", "").replace("@lid", "");
}

export default function ConversationsPage() {
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [text, setText] = useState("");
  const qc = useQueryClient();

  // ✅ CORREÇÃO AQUI: queryFn agora recebe o contexto do React Query
  const { data: chats = [], isLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const result = await getConversations();
      return result;
    },
    refetchInterval: 8000,
  });

  const list = Array.isArray(chats) ? chats : [];

  useEffect(() => {
    if (!selectedPhone && list.length > 0) {
      setSelectedPhone(list[0].phone);
    }
  }, [list, selectedPhone]);

  // ✅ CORREÇÃO AQUI: queryFn com parâmetro
  const { data: detail, isLoading: loadingDetail } = useQuery({
    queryKey: ["conversation", selectedPhone],
    queryFn: async () => {
      if (!selectedPhone) return null;
      return await getConversation(selectedPhone);
    },
    enabled: !!selectedPhone,
    refetchInterval: 5000,
  });

  const sendMut = useMutation({
    mutationFn: async () => {
      if (!selectedPhone) return;
      return await sendMessage(selectedPhone, text);
    },
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["conversation", selectedPhone] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  const messages = detail?.messages || [];

  return (
    <>
      <Header title="Conversas" subtitle="Chats do WhatsApp em tempo real" />
      <div className="flex flex-1 overflow-hidden">
        <div className="w-80 border-r border-border overflow-y-auto">
          {isLoading && (
            <p className="p-4 text-sm text-muted-foreground">Carregando...</p>
          )}
          {!isLoading && list.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">
              Nenhuma conversa. Fale com o bot no WhatsApp.
            </p>
          )}
          {list.map((chat: Conversation) => (
            <button
              key={chat.phone}
              onClick={() => setSelectedPhone(chat.phone)}
              className={cn(
                "flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-secondary/50",
                selectedPhone === chat.phone && "bg-primary/10"
              )}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                {displayPhone(chat.phone).slice(-2)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="truncate text-sm font-medium">
                    {displayPhone(chat.phone)}
                  </span>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {chat.lastMessage || "—"}
                </p>
                <span className="mt-1 inline-block rounded bg-primary/15 px-1.5 py-0.5 text-[10px] text-primary">
                  score {chat.lead_score ?? 0}
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="flex flex-1 flex-col">
          {selectedPhone ? (
            <>
              <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                  {displayPhone(selectedPhone).slice(-2)}
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {displayPhone(selectedPhone)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {selectedPhone}
                  </p>
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {loadingDetail && (
                  <p className="text-sm text-muted-foreground">Carregando mensagens...</p>
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
                    placeholder="Digite uma mensagem..."
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
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              Selecione uma conversa
            </div>
          )}
        </div>
      </div>
    </>
  );
}