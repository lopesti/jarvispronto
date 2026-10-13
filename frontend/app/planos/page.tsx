"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Bot, Check, Sparkles } from "lucide-react";
import { getPlans } from "@/lib/api";

type ApiPlan = {
  code: string;
  name: string;
  price_monthly: number;
  price_yearly?: number;
  limits: Record<string, number>;
  features: Record<string, unknown>;
  sort_order?: number;
};

const STYLE: Record<
  string,
  { popular?: boolean; border: string; btn: string; accent: string }
> = {
  trial: {
    border: "border-border",
    btn: "border border-border hover:bg-muted",
    accent: "text-muted-foreground",
  },
  prata: {
    border: "border-slate-500/30",
    btn: "border border-slate-400/40 text-slate-200 hover:bg-slate-500/10",
    accent: "text-slate-300",
  },
  gold: {
    popular: true,
    border: "border-amber-500/40",
    btn: "bg-amber-500 text-black hover:bg-amber-400 font-semibold",
    accent: "text-amber-400",
  },
  diamante: {
    border: "border-cyan-500/30",
    btn: "border border-cyan-400/40 text-cyan-200 hover:bg-cyan-500/10",
    accent: "text-cyan-300",
  },
};

function limitLabel(key: string, value: number): string {
  if (value === -1) return `${key}: ilimitado`;
  const map: Record<string, string> = {
    conversations: "conversas/mês",
    users: "usuários",
    whatsapp_numbers: "números WhatsApp",
    produtos: "produtos",
    history_days: "dias de histórico",
    messages: "mensagens/mês",
  };
  return `${Number(value).toLocaleString("pt-BR")} ${map[key] || key}`;
}

function featureLabels(features: Record<string, unknown>): string[] {
  const out: string[] = [];
  if (features.custom_prompt) out.push("Prompt personalizado");
  if (features.automations === "full" || features.automations === true) out.push("Automações completas");
  else if (features.automations === "basic") out.push("Automações básicas");
  if (features.webhooks) out.push("Webhooks");
  if (features.support) out.push(`Suporte: ${String(features.support)}`);
  if (features.white_label) out.push("White-label");
  if (features.multi_company === -1) out.push("Multi-empresa ilimitado");
  else if (Number(features.multi_company) > 0) out.push(`Multi-empresa: ${features.multi_company}`);
  return out;
}

export default function PlanosPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["public-plans"],
    queryFn: getPlans,
  });

  const plans = (data || [])
    .filter((p: ApiPlan) => p.code !== "trial")
    .sort((a: ApiPlan, b: ApiPlan) => (a.sort_order || 0) - (b.sort_order || 0));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#00d4aa] to-[#67e8f9]">
              <Bot className="h-4 w-4 text-[#0a0e17]" />
            </div>
            JARVIS
          </Link>
          <Link href="/register" className="text-sm text-primary">
            Criar conta
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-10 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Planos
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Escolha o plano certo para sua operação
          </h1>
          <p className="mt-3 text-muted-foreground">
            Limites e preços carregados do servidor — alinhados ao que o sistema realmente oferece.
          </p>
        </div>

        {isLoading && <p className="text-center text-muted-foreground">Carregando planos…</p>}
        {isError && (
          <p className="text-center text-destructive">
            Não foi possível carregar os planos. Tente novamente em instantes.
          </p>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan: ApiPlan) => {
            const style = STYLE[plan.code] || STYLE.prata;
            const limits = plan.limits || {};
            const feats = featureLabels(plan.features || {});
            return (
              <div
                key={plan.code}
                className={`relative flex flex-col rounded-2xl border bg-card p-6 ${style.border} ${
                  style.popular ? "shadow-lg shadow-amber-500/10" : ""
                }`}
              >
                {style.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-3 py-0.5 text-[10px] font-bold uppercase text-black">
                    Mais popular
                  </span>
                )}
                <h2 className={`text-lg font-extrabold uppercase tracking-wide ${style.accent}`}>
                  {plan.name}
                </h2>
                <div className="mt-3">
                  <span className="text-3xl font-extrabold">
                    R$ {Number(plan.price_monthly || 0).toLocaleString("pt-BR")}
                  </span>
                  <span className="text-sm text-muted-foreground"> /mês</span>
                </div>

                <ul className="mt-6 flex-1 space-y-2 text-sm">
                  {Object.entries(limits).map(([k, v]) => (
                    <li key={k} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{limitLabel(k, Number(v))}</span>
                    </li>
                  ))}
                  {feats.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={`/register?plan=${plan.code}`}
                  className={`mt-6 block rounded-xl px-4 py-2.5 text-center text-sm transition-colors ${style.btn}`}
                >
                  Começar com {plan.name}
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
