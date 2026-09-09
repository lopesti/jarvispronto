"use client";

import { Header } from "@/components/layout/header";

export default function SettingsPage() {
  return (
    <>
      <Header title="Configurações" subtitle="WhatsApp, IA e preferências" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-2xl">
        {/* Status WhatsApp */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-sm font-semibold">Conexão WhatsApp</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Status da sessão WPPConnect
          </p>
          <div className="mt-4 flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
            <span className="text-sm">Conectado</span>
          </div>
          <div className="mt-4 rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            QR Code aparece aqui quando desconectado
          </div>
        </div>

        {/* IA */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-sm font-semibold">Inteligência Artificial</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Modelo principal e fallback
          </p>
          <div className="mt-4 space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Modelo principal</label>
              <select className="mt-1 w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm">
                <option>Groq — LLaMA 3.3 70B</option>
                <option>Gemini 2.0 Flash</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">System Prompt</label>
              <textarea
                rows={4}
                className="mt-1 w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm"
                defaultValue="Você é o Rodrigo, consultor de vendas do Volumetrão Gel..."
              />
            </div>
          </div>
        </div>

        {/* API Backend */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-sm font-semibold">Backend</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            URL da API do JarvisPronto
          </p>
          <input
            type="text"
            defaultValue="http://localhost:3000"
            className="mt-3 w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm"
          />
        </div>
      </div>
    </>
  );
}
