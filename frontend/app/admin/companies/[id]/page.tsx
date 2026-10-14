"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
  ArrowLeft,
  Building2,
  Users,
  MessageSquare,
  MessagesSquare,
  Package,
  Calendar,
  CreditCard,
} from "lucide-react";

type CompanyDetail = {
  id: number;
  name: string;
  slug: string;
  plan_code: string | null;
  subscription_status: string | null;
  created_at: string;
  users_count: number | string;
  conversations_count: number | string;
  messages_count: number | string;
  products_count: number | string;
};

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold">{value || 0}</p>
    </div>
  );
}

export default function AdminCompanyDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!params?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get(`/api/admin/companies/${params.id}`);
        if (cancelled) return;
        setCompany(data);
      } catch (err: unknown) {
        if (cancelled) return;
        const msg =
          (err as { response?: { data?: { error?: string } } })?.response?.data
            ?.error || "Erro ao carregar empresa";
        setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params?.id]);

  if (loading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Carregando empresa...
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="space-y-4 p-6">
        <button
          onClick={() => router.push("/admin/companies")}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-400">
          {error || "Empresa não encontrada"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <button
          onClick={() => router.push("/admin/companies")}
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Empresas
        </button>

        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/20">
            <Building2 className="h-7 w-7 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold">{company.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              #{company.id} · {company.slug}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {company.plan_code && (
                <span className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                  Plano {company.plan_code}
                </span>
              )}
              {company.subscription_status && (
                <span className="rounded-md bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
                  {company.subscription_status}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
          Métricas
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricCard icon={Users} label="Usuários" value={company.users_count} />
          <MetricCard
            icon={MessageSquare}
            label="Conversas"
            value={company.conversations_count}
          />
          <MetricCard
            icon={MessagesSquare}
            label="Mensagens"
            value={company.messages_count}
          />
          <MetricCard
            icon={Package}
            label="Produtos"
            value={company.products_count}
          />
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
          Informações
        </h2>
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CreditCard className="h-4 w-4" />
              <span>Assinatura</span>
            </div>
            <span className="text-sm font-medium">
              {company.subscription_status || "—"}
            </span>
          </div>
          <div className="flex items-center justify-between border-b border-border p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CreditCard className="h-4 w-4" />
              <span>Plano</span>
            </div>
            <span className="text-sm font-medium">
              {company.plan_code || "—"}
            </span>
          </div>
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Criada em</span>
            </div>
            <span className="text-sm font-medium">
              {company.created_at
                ? new Date(company.created_at).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })
                : "—"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
