"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Activity, Building2, Users, MessageSquare, MessagesSquare,
  RefreshCw, Search, AlertTriangle, Clock, X
} from "lucide-react";

type Company = {
  id: number;
  name: string;
  plan_code?: string;
  subscription_status?: string;
  conversations: number;
  messages: number;
  users: number;
  needs_human: number;
  last_activity?: string | null;
};

type Overview = {
  totals: {
    companies: number;
    users: number;
    conversations: number;
    messages: number;
    needs_human: number;
    active_24h: number;
    messages_24h: number;
    active_subscriptions: number;
  };
  companies: Company[];
  generatedAt: string;
};

type Conversation = {
  id: number;
  companyId: number;
  companyName: string;
  phone: string;
  displayName?: string;
  channel?: string;
  status?: string;
  currentStep?: string;
  leadScore?: number;
  needsHuman?: boolean;
  lastMessage?: string;
  lastMessageAt?: string;
  messageCount: number;
  updatedAt?: string;
};

type ActivityItem = {
  id: number;
  companyId: number;
  companyName: string;
  phone: string;
  role?: string;
  direction?: string;
  content: string;
  channel?: string;
  createdAt: string;
  displayName?: string;
  currentStep?: string;
  needsHuman?: boolean;
};

type Detail = {
  conversation: Record<string, unknown>;
  messages: Array<{
    id: number;
    role?: string;
    direction?: string;
    content: string;
    created_at: string;
    channel?: string;
  }>;
};

function number(value?: number | string) {
  return Number(value || 0).toLocaleString("pt-BR");
}

function date(value?: string | null) {
  if (!value) return "Sem atividade";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? "Data indisponível"
    : parsed.toLocaleString("pt-BR");
}

function Metric({
  label, value, icon: Icon, description
}: {
  label: string;
  value: number | string;
  icon: typeof Activity;
  description?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="mt-3 text-2xl font-bold">{number(value)}</div>
      {description && (
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

export default function MonitoramentoPage() {
  const [companyId, setCompanyId] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Conversation | null>(null);

  const filter = companyId ? `?companyId=${companyId}` : "";

  const overview = useQuery<Overview>({
    queryKey: ["admin-monitoring-overview"],
    queryFn: async () => (await api.get("/api/admin/monitoring/overview")).data,
    refetchInterval: 10000,
  });

  const activity = useQuery<ActivityItem[]>({
    queryKey: ["admin-monitoring-activity", companyId],
    queryFn: async () =>
      (await api.get(`/api/admin/monitoring/activity${filter ? `${filter}&limit=40` : "?limit=40"}`)).data,
    refetchInterval: 10000,
  });

  const conversations = useQuery<Conversation[]>({
    queryKey: ["admin-monitoring-conversations", companyId, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (companyId) params.set("companyId", companyId);
      if (search.trim()) params.set("q", search.trim());
      params.set("limit", "100");
      return (await api.get(`/api/admin/monitoring/conversations?${params.toString()}`)).data;
    },
    refetchInterval: 10000,
  });

  const detail = useQuery<Detail>({
    queryKey: ["admin-monitoring-detail", selected?.companyId, selected?.phone],
    queryFn: async () => {
      if (!selected) throw new Error("Conversa não selecionada");
      return (await api.get(
        `/api/admin/monitoring/conversations/${selected.companyId}/${encodeURIComponent(selected.phone)}`
      )).data;
    },
    enabled: !!selected,
  });

  const totals = overview.data?.totals;
  const companies = overview.data?.companies || [];

  return (
    <>
      <header className="flex min-h-16 items-center justify-between gap-3 border-b border-border px-6 py-3">
        <div>
          <h1 className="text-lg font-semibold">Monitoramento Global</h1>
          <p className="text-xs text-muted-foreground">
            Acompanhamento centralizado de empresas, conversas e mensagens
          </p>
        </div>
        <button
          onClick={() => {
            overview.refetch();
            activity.refetch();
            conversations.refetch();
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary"
        >
          <RefreshCw className={`h-4 w-4 ${overview.isFetching ? "animate-spin" : ""}`} />
          Atualizar
        </button>
      </header>

      <div className="page-scroll page-pad space-y-6">
        {(overview.isError || activity.isError || conversations.isError) && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            Erro ao carregar os dados. Verifique sua sessão de administrador e a API.
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Empresas" value={totals?.companies ?? 0} icon={Building2} />
          <Metric label="Usuários" value={totals?.users ?? 0} icon={Users} />
          <Metric label="Conversas" value={totals?.conversations ?? 0} icon={MessagesSquare} />
          <Metric label="Mensagens" value={totals?.messages ?? 0} icon={MessageSquare} />
          <Metric label="Ativas nas últimas 24h" value={totals?.active_24h ?? 0} icon={Activity} />
          <Metric label="Mensagens nas últimas 24h" value={totals?.messages_24h ?? 0} icon={Clock} />
          <Metric label="Aguardando atendimento" value={totals?.needs_human ?? 0} icon={AlertTriangle} />
          <Metric label="Assinaturas ativas" value={totals?.active_subscriptions ?? 0} icon={Building2} />
        </section>

        <section className="rounded-xl border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
            <div>
              <h2 className="font-semibold">Empresas monitoradas</h2>
              <p className="text-xs text-muted-foreground">
                {companies.length} empresas encontradas
              </p>
            </div>
            <select
              value={companyId}
              onChange={(event) => {
                setCompanyId(event.target.value);
                setSelected(null);
              }}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">Todas as empresas</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>

          {overview.isLoading ? (
            <p className="p-5 text-sm text-muted-foreground">Carregando empresas...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-secondary/40 text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3">Empresa</th>
                    <th className="px-5 py-3">Usuários</th>
                    <th className="px-5 py-3">Conversas</th>
                    <th className="px-5 py-3">Mensagens</th>
                    <th className="px-5 py-3">Pendências</th>
                    <th className="px-5 py-3">Última atividade</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((company) => (
                    <tr key={company.id} className="border-t border-border hover:bg-secondary/30">
                      <td className="px-5 py-3 font-medium">{company.name}</td>
                      <td className="px-5 py-3">{number(company.users)}</td>
                      <td className="px-5 py-3">{number(company.conversations)}</td>
                      <td className="px-5 py-3">{number(company.messages)}</td>
                      <td className="px-5 py-3">{number(company.needs_human)}</td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">{date(company.last_activity)}</td>
                    </tr>
                  ))}
                  {!companies.length && (
                    <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">
                      {overview.isLoading ? "Carregando..." : "Nenhuma empresa retornada pela API."}
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-xl border border-border bg-card">
            <div className="border-b border-border p-5">
              <h2 className="font-semibold">Conversas</h2>
              <p className="text-xs text-muted-foreground">Selecione uma conversa para abrir o histórico</p>
              <div className="relative mt-3">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar telefone, contato ou empresa..."
                  className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm"
                />
              </div>
            </div>
            <div className="max-h-[560px] divide-y divide-border overflow-y-auto">
              {(conversations.data || []).map((conversation) => (
                <button
                  key={`${conversation.companyId}-${conversation.id}-${conversation.phone}`}
                  onClick={() => setSelected(conversation)}
                  className={`w-full p-4 text-left transition-colors hover:bg-secondary/40 ${
                    selected?.id === conversation.id && selected?.companyId === conversation.companyId
                      ? "bg-primary/10"
                      : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {conversation.displayName || conversation.phone}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {conversation.companyName} · {conversation.phone}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {number(conversation.messageCount)} msgs
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                    {conversation.lastMessage || "Sem mensagem registrada"}
                  </p>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {date(conversation.updatedAt)}
                    {conversation.needsHuman ? " · Precisa de atendimento" : ""}
                  </p>
                </button>
              ))}
              {conversations.isLoading && <p className="p-5 text-sm text-muted-foreground">Carregando conversas...</p>}
              {!conversations.isLoading && !conversations.data?.length && (
                <p className="p-5 text-sm text-muted-foreground">Nenhuma conversa encontrada.</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border p-5">
              <div>
                <h2 className="font-semibold">Histórico de mensagens</h2>
                <p className="text-xs text-muted-foreground">
                  {selected ? `${selected.companyName} · ${selected.phone}` : "Selecione uma conversa"}
                </p>
              </div>
              {selected && (
                <button onClick={() => setSelected(null)} className="rounded-lg p-2 hover:bg-secondary" aria-label="Fechar histórico">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="max-h-[560px] space-y-3 overflow-y-auto p-4">
              {!selected && (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Clique em uma conversa para visualizar suas mensagens.
                </p>
              )}
              {detail.isLoading && <p className="text-sm text-muted-foreground">Carregando histórico...</p>}
              {detail.isError && <p className="text-sm text-red-400">Não foi possível carregar o histórico.</p>}
              {(detail.data?.messages || []).map((message) => {
                const outgoing = message.direction === "out" || message.role === "assistant";
                return (
                  <div key={message.id} className={`flex ${outgoing ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-xl p-3 ${
                      outgoing ? "bg-primary/15" : "bg-secondary"
                    }`}>
                      <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>
                      <p className="mt-2 text-[10px] text-muted-foreground">
                        {message.role || message.direction || "mensagem"} · {date(message.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
              {selected && detail.data && !detail.data.messages.length && (
                <p className="text-sm text-muted-foreground">Nenhuma mensagem encontrada.</p>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card">
          <div className="border-b border-border p-5">
            <h2 className="font-semibold">Atividade recente</h2>
            <p className="text-xs text-muted-foreground">Últimas mensagens registradas no sistema</p>
          </div>
          <div className="divide-y divide-border">
            {(activity.data || []).map((item) => (
              <div key={item.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {item.companyName} · {item.displayName || item.phone}
                  </p>
                  <p className="mt-1 break-words text-sm text-muted-foreground">{item.content}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.direction || item.role || "Mensagem"} · {item.channel || "Canal não informado"}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">{date(item.createdAt)}</span>
              </div>
            ))}
            {activity.isLoading && <p className="p-5 text-sm text-muted-foreground">Carregando atividade...</p>}
            {!activity.isLoading && !activity.data?.length && (
              <p className="p-5 text-sm text-muted-foreground">Nenhuma atividade encontrada.</p>
            )}
          </div>
        </section>

        <p className="text-center text-xs text-muted-foreground">
          Atualização automática a cada 10 segundos.
          {overview.data?.generatedAt ? ` Última consulta: ${date(overview.data.generatedAt)}.` : ""}
        </p>
      </div>
    </>
  );
}
