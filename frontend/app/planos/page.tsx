"use client";

import Link from "next/link";
import { Bot, Check, X, Sparkles } from "lucide-react";

type Plan = {
  id: string;
  name: string;
  icon: string;
  price: number;
  description: string;
  features: { label: string; included: boolean }[];
  cta: string;
  ctaHref: string;
  popular?: boolean;
  color: string;
  borderColor: string;
  textColor: string;
  btnClass: string;
};

const plans: Plan[] = [
  {
    id: "prata",
    name: "PRATA",
    icon: "🥈",
    price: 99,
    description: "Ideal para quem esta comecando a automatizar o atendimento.",
    features: [
      { label: "1.000 mensagens/mes", included: true },
      { label: "1 numero de WhatsApp", included: true },
      { label: "2 usuarios", included: true },
      { label: "Ate 20 produtos", included: true },
      { label: "Funil de vendas + score", included: true },
      { label: "IA (Groq + Gemini)", included: true },
      { label: "Prompt personalizado", included: false },
      { label: "Multiplos canais (IG/Meta)", included: false },
    ],
    cta: "Comecar com Prata",
    ctaHref: "/register?plan=prata",
    color: "text-slate-300",
    borderColor: "border-slate-500/30",
    textColor: "text-slate-300",
    btnClass: "border border-slate-400/40 text-slate-200 hover:bg-slate-500/10",
  },
  {
    id: "gold",
    name: "GOLD",
    icon: "🥇",
    price: 299,
    description: "Para empresas que ja vendem e querem escalar com personalizacao.",
    features: [
      { label: "10.000 mensagens/mes", included: true },
      { label: "3 numeros de WhatsApp", included: true },
      { label: "10 usuarios", included: true },
      { label: "Ate 200 produtos", included: true },
      { label: "Funil de vendas + score", included: true },
      { label: "IA (Groq + Gemini)", included: true },
      { label: "Prompt personalizado", included: true },
      { label: "Multiplos canais (IG/Meta)", included: false },
    ],
    cta: "Comecar com Gold",
    ctaHref: "/register?plan=gold",
    popular: true,
    color: "text-amber-400",
    borderColor: "border-amber-500/40",
    textColor: "text-amber-400",
    btnClass: "bg-amber-500 text-black hover:bg-amber-400 font-semibold",
  },
  {
    id: "diamante",
    name: "DIAMANTE",
    icon: "💎",
    price: 999,
    description: "Para operacoes grandes, com multiplos numeros e canais.",
    features: [
      { label: "50.000 mensagens/mes", included: true },
      { label: "10 numeros de WhatsApp", included: true },
      { label: "50 usuarios", included: true },
      { label: "Produtos ilimitados", included: true },
      { label: "Funil de vendas + score", included: true },
      { label: "IA (Groq + Gemini)", included: true },
      { label: "Prompt personalizado", included: true },
      { label: "Multiplos canais (IG/Meta)", included: true },
    ],
    cta: "Falar com vendas",
    ctaHref: "/register?plan=diamante",
    color: "text-cyan-300",
    borderColor: "border-cyan-500/40",
    textColor: "text-cyan-300",
    btnClass: "border border-cyan-400/40 text-cyan-200 hover:bg-cyan-500/10",
  },
];

export default function PlanosPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <span className="font-bold tracking-tight">JARVIS Comercial</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Entrar
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Comecar gratis
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pt-16 pb-8 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Planos que crescem com seu negocio
        </div>
        <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
          Escolha o plano ideal
        </h1>
        <p className="mx-auto max-w-2xl text-sm text-muted-foreground sm:text-base">
          Atendimento e funil de vendas no WhatsApp, multi-empresa,
          <br className="hidden sm:block" />
          com IA e painel — do primeiro oi ate o fechamento.
        </p>
      </section>

      {/* Grid de planos */}
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border ${plan.borderColor} bg-card p-7 transition-all hover:-translate-y-1 ${
                plan.popular ? "md:scale-105" : ""
              }`}
            >
              {/* Badge Mais Popular */}
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-black">
                  Mais Popular
                </div>
              )}

              {/* Header do card */}
              <div className="mb-4 flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-xl`}>
                  {plan.icon}
                </div>
                <h2 className={`text-lg font-bold tracking-wider ${plan.color}`}>
                  {plan.name}
                </h2>
              </div>

              {/* Preco */}
              <div className="mb-2">
                <span className="align-top text-sm text-muted-foreground">R$</span>
                <span className={`ml-1 text-4xl font-extrabold tracking-tight ${plan.color}`}>
                  {plan.price}
                </span>
                <span className="ml-1 text-xs text-muted-foreground">/mes</span>
              </div>

              <p className="mb-6 text-xs leading-relaxed text-muted-foreground">
                {plan.description}
              </p>

              {/* Divider */}
              <div className="mb-5 border-t border-border" />

              {/* Features */}
              <ul className="mb-6 flex-1 space-y-2.5">
                {plan.features.map((f, i) => (
                  <li
                    key={i}
                    className={`flex items-start gap-2 text-xs ${
                      f.included ? "text-foreground" : "text-muted-foreground/50"
                    }`}
                  >
                    {f.included ? (
                      <Check className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${plan.color}`} />
                    ) : (
                      <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
                    )}
                    <span className={f.included ? "" : "line-through"}>
                      {f.label}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link
                href={plan.ctaHref}
                className={`block rounded-lg px-4 py-2.5 text-center text-sm transition-all ${plan.btnClass}`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* Rodape */}
        <p className="mt-12 text-center text-xs text-muted-foreground">
          Precisa de um plano customizado?{" "}
          <Link href="/register" className="text-primary hover:underline">
            Fale com nosso time
          </Link>
          .
        </p>
      </section>
    </div>
  );
}