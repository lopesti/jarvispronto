"use client";

import { Header } from "@/components/layout/header";
import { useQuery } from "@tanstack/react-query";
import { getConversations } from "@/lib/api";

export default function OverviewPage() {
  // ✅ CORREÇÃO: queryFn com async/await
  const { data: conversations = [] } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const result = await getConversations();
      return result;
    },
    refetchInterval: 15000,
  });

  const totalConversations = conversations.length;
  const activeConversations = conversations.filter(
    (c) => c.status === "active" || c.status === "open"
  ).length;
  
  // ✅ CORREÇÃO: forçar conversão para número com Number()
  const totalMessages = conversations.reduce(
    (acc, c) => acc + Number(c.messageCount || 0),
    0
  );
  
  const avgScore =
    conversations.length > 0
      ? Math.round(
          conversations.reduce((acc, c) => acc + Number(c.lead_score || 0), 0) /
            conversations.length
        )
      : 0;

  return (
    <>
      <Header title="Dashboard" subtitle="Visão geral do seu WhatsApp" />
      <div className="p-6">
        {/* Cards simples sem componentes UI */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Total de Conversas</p>
            <p className="text-2xl font-bold">{totalConversations}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Conversas Ativas</p>
            <p className="text-2xl font-bold">{activeConversations}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Score Médio</p>
            <p className="text-2xl font-bold">{avgScore}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Total de Mensagens</p>
            <p className="text-2xl font-bold">{totalMessages}</p>
          </div>
        </div>

        {/* Últimas conversas */}
        <div className="mt-6 rounded-lg border border-border bg-card p-4">
          <h3 className="mb-4 text-lg font-semibold">Últimas Conversas</h3>
          {conversations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma conversa ainda. Conecte seu WhatsApp para começar.
            </p>
          ) : (
            <div className="space-y-4">
              {conversations.slice(0, 5).map((conv) => (
                <div
                  key={conv.phone}
                  className="flex items-center justify-between border-b border-border pb-3 last:border-0"
                >
                  <div>
                    <p className="font-medium">{conv.name || conv.phone}</p>
                    <p className="text-sm text-muted-foreground">
                      {conv.lastMessage || "Sem mensagens"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {Number(conv.messageCount || 0)} msgs
                    </span>
                    <span className="rounded bg-primary/15 px-2 py-0.5 text-xs text-primary">
                      score {Number(conv.lead_score || 0)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}