"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Link from "next/link";
import {
  ArrowLeft, Building2, Users, MessageSquare, Package,
  Activity, RefreshCw, Search, Clock, UserRound
} from "lucide-react";
import { useState } from "react";

type Company = {
  id: number;
  name: string;
  slug: string;
  plan_code: string | null;
  subscription_status: string | null;
  created_at: string;
  users_count: number;
  conversations_count: number;
  messages_count: number;
  products_count: number;
};

type Conversation = {
  id: number;
  companyId: number;
  companyName: string;
  phone: string;
  displayName: string | null;
  channel: string | null;
  status: string | null;
  currentStep: string | null;
  leadScore: number | null;
  needsHuman: boolean;
  lastMessage: string | null;
  lastMessageAt: string | null;
  messageCount: number;
  updatedAt: string;
};

type ActivityItem = {
  id: number;
  phone: string;
  role: string;
  direction: string;
  content: string;
  channel: string;
  createdAt: string;
  displayName: string | null;
};

type UserItem = {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at: string;
};

function Metric({ title, value, icon: Icon }: {
  title: string;
  value: number;
  icon: any;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{title}</span>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="mt-3 text-2xl font-bold">{Number(value || 0).toLocaleString("pt-BR")}</p>
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleString("pt-BR");
}

export default function AdminCompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id || "");
  const [search, setSearch] = useState("");
  const [accessing, setAccessing] = useState(false);
  const queryClient = useQueryClient();

  const { data: company, isLoading, error, refetch } = useQuery<Company>({
    queryKey: ["admin-company-detail", id],
    queryFn: async () => {
      const { data } = await api.get(`/api/admin/companies/${id}`);
      return data;
    },
    enabled: !!id,
    refetchInterval: 15000,
  });

  const { data: conversations = [], isLoading: loadingConversations } =
    useQuery<Conversation[]>({
      queryKey: ["admin-company-conversations", id],
      queryFn: async () => {
        const { data } = await api.get("/api/admin/monitoring/conversations", {
          params: { companyId: id, limit: 100 },
        });
        return Array.isArray(data) ? data : [];
      },
      enabled: !!id,
      refetchInterval: 10000,
    });

  const { data: activity = [] } = useQuery<ActivityItem[]>({
    queryKey: ["admin-company-activity", id],
    queryFn: async () => {
      const { data } = await api.get("/api/admin/monitoring/activity", {
        params: { companyId: id, limit: 30 },
      });
      return Array.isArray(data) ? data : [];
    },
    enabled: !!id,
    refetchInterval: 10000,
  });

  const { data: users = [], isLoading: loadingUsers } = useQuery<UserItem[]>({
    queryKey: ["admin-company-users", id],
    queryFn: async () => {
      const { data } = await api.get(`/api/admin/users?companyId=${id}`);
      return Array.isArray(data) ? data : [];
    },
    enabled: !!id,
  });


  async function accessAsCompany() {
    if (accessing || !company) return;

    setAccessing(true);
    try {
      const { data } = await api.post(
        `/api/admin/companies/${id}/access-context`
      );

      if (!data?.contextToken || !data?.company) {
        throw new Error("Resposta invalida do servidor");
      }

      queryClient.clear();

      sessionStorage.setItem(
        "jarvis_admin_company_context",
        data.contextToken
      );

      sessionStorage.setItem(
        "jarvis_admin_company_info",
        JSON.stringify(data.company)
      );

      window.dispatchEvent(new Event("jarvis-admin-context-changed"));
      router.push("/overview");
    } catch (error: any) {
      console.error("Erro ao acessar empresa:", error);
      alert(
        error?.response?.data?.error ||
        error?.message ||
        "Nao foi possivel acessar esta empresa."
      );
      setAccessing(false);
    }
  }
  const filteredConversations = conversations.filter((item) => {
    const term = search.toLowerCase();
    return (
      (item.phone || "").toLowerCase().includes(term) ||
      (item.displayName || "").toLowerCase().includes(term) ||
      (item.lastMessage || "").toLowerCase().includes(term)
    );
  });

  if (isLoading) {
    return (
      <div className="page-scroll page-pad">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 rounded bg-muted" />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-28 rounded-xl bg-muted" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="page-scroll page-pad">
        <button
          onClick={() => router.push("/admin/companies")}
          className="mb-5 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar para empresas
        </button>
        <div className="rounded-xl border border-destructive/30 bg-card p-6">
          <h2 className="font-semibold">NÃ£o foi possÃ­vel carregar a empresa</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Verifique sua sessÃ£o e as permissÃµes de SUPERADMIN.
          </p>
          <button onClick={() => refetch()} className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <header className="flex min-h-16 items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/admin/companies")}
            className="rounded-lg p-2 hover:bg-secondary"
            title="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-semibold">{company.name}</h1>
            <p className="text-xs text-muted-foreground">
              AdministraÃ§Ã£o global Â· Empresa #{company.id}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={accessAsCompany}
            disabled={accessing}
            className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            <Building2 className="h-4 w-4" />
            {accessing ? "Acessando..." : "Acessar como empresa"}
          </button>

          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary"
          >
            <RefreshCw className="h-4 w-4" /> Atualizar
          </button>
        </div>
      </header>

      <div className="page-scroll page-pad space-y-6">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-secondary px-3 py-1">
            Plano: {company.plan_code || "NÃ£o definido"}
          </span>
          <span className="rounded-full bg-secondary px-3 py-1">
            Status: {company.subscription_status || "NÃ£o definido"}
          </span>
          <span className="rounded-full bg-secondary px-3 py-1">
            Slug: {company.slug || "-"}
          </span>
          <span className="rounded-full bg-secondary px-3 py-1">
            Criada em: {formatDate(company.created_at)}
          </span>
        </div>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric title="UsuÃ¡rios" value={company.users_count} icon={Users} />
          <Metric title="Conversas" value={company.conversations_count} icon={MessageSquare} />
          <Metric title="Mensagens" value={company.messages_count} icon={Activity} />
          <Metric title="Produtos" value={company.products_count} icon={Package} />
        </section>

        <section className="rounded-xl border border-border bg-card">
          <div className="border-b border-border p-4">
            <h2 className="font-semibold">Conversas e leads</h2>
            <p className="text-xs text-muted-foreground">
              Conversas registradas para esta empresa
            </p>
            <div className="relative mt-3 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por telefone, nome ou mensagem..."
                className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
              />
            </div>
          </div>

          {loadingConversations ? (
            <p className="p-5 text-sm text-muted-foreground">Carregando conversas...</p>
          ) : filteredConversations.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              Nenhuma conversa encontrada para esta empresa.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {filteredConversations.map((item) => (
                <div key={item.id} className="p-4 hover:bg-secondary/30">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">
                        {item.displayName || item.phone}
                      </p>
                      <p className="text-xs text-muted-foreground">{item.phone}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-secondary px-2 py-1">
                        {item.status || "sem status"}
                      </span>
                      {item.needsHuman && (
                        <span className="rounded-full bg-amber-500/10 px-2 py-1 text-amber-600">
                          Precisa de atendente
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                    {item.lastMessage || "Sem mensagem registrada"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span>{item.messageCount || 0} mensagens</span>
                    <span>Etapa: {item.currentStep || "-"}</span>
                    <span>Canal: {item.channel || "-"}</span>
                    <span>Atualizada: {formatDate(item.updatedAt)}</span>
                  </div>
                  <Link
                    href={`/admin/monitoramento?companyId=${id}&phone=${encodeURIComponent(item.phone)}`}
                    className="mt-3 inline-block text-xs font-medium text-primary hover:underline"
                  >
                    Consultar no monitoramento global
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="rounded-xl border border-border bg-card">
            <div className="border-b border-border p-4">
              <h2 className="font-semibold">UsuÃ¡rios da empresa</h2>
            </div>
            {loadingUsers ? (
              <p className="p-4 text-sm text-muted-foreground">Carregando usuÃ¡rios...</p>
            ) : users.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">
                NÃ£o foi possÃ­vel obter usuÃ¡rios por uma rota especÃ­fica, ou nÃ£o hÃ¡ usuÃ¡rios.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center gap-3 p-4">
                    <UserRound className="h-8 w-8 rounded-full bg-secondary p-1.5" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{user.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <span className="ml-auto text-xs text-muted-foreground">{user.role}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card">
            <div className="border-b border-border p-4">
              <h2 className="font-semibold">Atividade recente</h2>
              <p className="text-xs text-muted-foreground">
                Ãšltimas mensagens registradas
              </p>
            </div>
            {activity.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">
                Nenhuma atividade registrada.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {activity.slice(0, 15).map((item) => (
                  <div key={item.id} className="p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium">
                        {item.displayName || item.phone}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(item.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {item.content}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {item.role || item.direction || "Mensagem"} Â· {item.channel || "Canal nÃ£o informado"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

