"use client";

import Link from "next/link";
import { Bot, MessageSquare, GitBranch, Zap, Shield, ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <span className="font-bold tracking-tight">JARVIS Comercial</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
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

      <section className="mx-auto max-w-6xl px-4 py-20 text-center">
        <p className="mb-4 text-sm font-medium text-primary">IA de vendas omnichannel</p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          Seu funil de vendas
          <br />
          <span className="text-primary">no WhatsApp e nas redes</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Atenda leads, avance etapas no Kanban e feche pedidos com IA —
          WhatsApp hoje, Instagram e Facebook no mesmo painel.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Criar conta <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-border px-6 py-3 text-sm font-medium hover:bg-secondary"
          >
            Acessar painel
          </Link>
        </div>
      </section>

      <section className="border-y border-border bg-card/50 py-16">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: MessageSquare, title: "Inbox unificada", desc: "Conversas de varios canais em um so lugar" },
            { icon: GitBranch, title: "Kanban vivo", desc: "Leads andam conforme o atendimento" },
            { icon: Zap, title: "IA comercial", desc: "Respostas com contexto e funil" },
            { icon: Shield, title: "Multi-usuario", desc: "Equipe com acesso seguro ao painel" },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-card p-6">
              <f.icon className="mb-3 h-8 w-8 text-primary" />
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-2xl font-bold">Canais</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm text-muted-foreground">
          WhatsApp ativo. Instagram e Facebook preparados (Meta). Marketplaces na roadmap.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {["WhatsApp", "Instagram", "Facebook", "Mercado Livre", "Shopee", "TikTok", "YouTube"].map(
            (c, i) => (
              <span
                key={c}
                className={`rounded-full border px-4 py-1.5 text-sm ${
                  i === 0
                    ? "border-primary/40 bg-primary/15 text-primary"
                    : i < 3
                      ? "border-border bg-secondary text-foreground"
                      : "border-border text-muted-foreground"
                }`}
              >
                {c}
                {i === 0 ? " · ativo" : i < 3 ? " · base pronta" : " · em breve"}
              </span>
            )
          )}
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        JARVIS Comercial · Vendas com IA
      </footer>
    </div>
  );
}
