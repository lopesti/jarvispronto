"use client";

import { Header } from "@/components/layout/header";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAgent,
  updateAgent,
  publishAgent,
  previewAgent,
  type Agent,
} from "@/lib/agents-api";
import { useApiMutation } from "@/lib/use-api-mutation";
import { useParams, useRouter } from "next/navigation";
import {
  Bot,
  BookOpen,
  Wrench,
  MessageSquare,
  Eye,
  Rocket,
  RefreshCw,
  Radio,
} from "lucide-react";

const TOOL_OPTIONS = [
  { key: "consultar_estoque", label: "Consultar estoque" },
  { key: "encaminhar_humano", label: "Encaminhar para humano" },
  { key: "gerar_link_pagamento", label: "Gerar link de pagamento" },
  { key: "produtos_similares", label: "Sugerir produtos similares" },
  { key: "calcular_margem", label: "Calcular margem" },
];

const CHANNEL_OPTIONS = ["whatsapp", "webchat", "instagram"];

export default function AgentBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const agentId = Number(id);

  const { data: agent, isLoading } = useQuery({
    queryKey: ["agent", agentId],
    queryFn: () => getAgent(agentId),
    enabled: !!agentId,
  });

  const [tab, setTab] = useState<"profile" | "knowledge" | "tools" | "behavior" | "channels">("profile");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [welcome, setWelcome] = useState("");
  const [prompt, setPrompt] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [tools, setTools] = useState<Record<string, boolean>>({});
  const [channels, setChannels] = useState<Record<string, boolean>>({});
  const [previewMsg, setPreviewMsg] = useState("Olá, quanto custa?");
  const [previewRes, setPreviewRes] = useState<any>(null);

  useEffect(() => {
    if (!agent) return;
    setName(agent.name || "");
    setDescription(agent.description || "");
    setWelcome(agent.welcome_message || "");
    setPrompt(agent.system_prompt || "");
    setTemperature(Number(agent.temperature ?? 0.7));
    const tmap: Record<string, boolean> = {};
    TOOL_OPTIONS.forEach((t) => {
      tmap[t.key] = (agent.tools || []).some((x) => x.tool_key === t.key && x.enabled);
    });
    setTools(tmap);
    const cmap: Record<string, boolean> = {};
    CHANNEL_OPTIONS.forEach((c) => {
      cmap[c] = (agent.channels || []).some((x) => x.channel === c && x.enabled);
    });
    if (!(agent.channels || []).length) cmap.whatsapp = true;
    setChannels(cmap);
  }, [agent]);

  const saveMut = useApiMutation({
    mutationFn: () =>
      updateAgent(agentId, {
        name,
        description,
        welcome_message: welcome,
        system_prompt: prompt,
        temperature,
        tools: TOOL_OPTIONS.map((t) => ({
          tool_key: t.key,
          enabled: !!tools[t.key],
        })),
        channels: CHANNEL_OPTIONS.filter((c) => channels[c]).map((c) => ({
          channel: c,
          enabled: true,
        })),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent", agentId] }),
    successMessage: "Agente salvo (nova versão)",
  });

  const refreshMut = useApiMutation({
    mutationFn: () => updateAgent(agentId, { refresh_knowledge: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent", agentId] }),
    successMessage: "Knowledge atualizado com dados do produto",
  });

  const pubMut = useApiMutation({
    mutationFn: () => publishAgent(agentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent", agentId] }),
    successMessage: "Agente publicado",
  });

  const prevMut = useApiMutation({
    mutationFn: () => previewAgent(agentId, previewMsg),
    onSuccess: (res) => setPreviewRes(res),
  });

  const tabs = [
    { id: "profile" as const, label: "Profile", icon: Bot },
    { id: "knowledge" as const, label: "Knowledge", icon: BookOpen },
    { id: "tools" as const, label: "Tools", icon: Wrench },
    { id: "behavior" as const, label: "Behavior", icon: MessageSquare },
    { id: "channels" as const, label: "Channels", icon: Radio },
  ];

  if (isLoading) {
    return (
      <>
        <Header title="Agent Builder" subtitle="Carregando..." />
        <div className="page-pad text-muted-foreground">Carregando agente...</div>
      </>
    );
  }

  if (!agent) {
    return (
      <>
        <Header title="Agent Builder" subtitle="Não encontrado" />
        <div className="page-pad">
          <p className="text-muted-foreground">Agente não encontrado.</p>
          <button onClick={() => router.push("/agents")} className="mt-2 text-sm text-primary">
            Voltar
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        title={agent.name}
        subtitle={`Produto: ${agent.produto_nome} · v${agent.version} · ${agent.status}`}
      />
      <div className="page-scroll page-pad">
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending}
            className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
          >
            {saveMut.isPending ? "Salvando..." : "Salvar"}
          </button>
          {agent.status !== "published" && (
            <button
              onClick={() => pubMut.mutate()}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 px-3 py-2 text-sm text-emerald-400"
            >
              <Rocket className="h-4 w-4" /> Publicar
            </button>
          )}
          <button
            onClick={() => router.push("/agents")}
            className="rounded-lg border border-border px-3 py-2 text-sm"
          >
            Voltar
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-card p-1">
              {tabs.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition ${
                      tab === t.id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {t.label}
                  </button>
                );
              })}
            </div>

            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              {tab === "profile" && (
                <>
                  <div>
                    <label className="text-xs text-muted-foreground">Nome</label>
                    <input className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Descrição</label>
                    <textarea className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Welcome message</label>
                    <input className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" value={welcome} onChange={(e) => setWelcome(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Temperature: {temperature}</label>
                    <input type="range" min={0} max={1} step={0.1} className="mt-1 w-full" value={temperature} onChange={(e) => setTemperature(Number(e.target.value))} />
                  </div>
                </>
              )}

              {tab === "knowledge" && (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Gerado automaticamente a partir do produto (preço, estoque, descrição)
                    </p>
                    <button
                      onClick={() => refreshMut.mutate()}
                      className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs"
                    >
                      <RefreshCw className="h-3 w-3" /> Atualizar
                    </button>
                  </div>
                  <pre className="max-h-80 overflow-auto rounded-lg bg-secondary/50 p-3 text-xs whitespace-pre-wrap">
                    {agent.knowledge || "Sem knowledge"}
                  </pre>
                  <p className="text-[11px] text-muted-foreground">
                    Produto: {agent.produto_nome} · Preço R$ {Number(agent.produto_preco || 0).toFixed(2)} · Estoque {agent.produto_estoque}
                  </p>
                </>
              )}

              {tab === "tools" && (
                <div className="space-y-2">
                  {TOOL_OPTIONS.map((t) => (
                    <label key={t.key} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={!!tools[t.key]}
                        onChange={(e) => setTools({ ...tools, [t.key]: e.target.checked })}
                      />
                      {t.label}
                      <span className="ml-auto text-[10px] text-muted-foreground">{t.key}</span>
                    </label>
                  ))}
                </div>
              )}

              {tab === "behavior" && (
                <div>
                  <label className="text-xs text-muted-foreground">System prompt (instruções + knowledge)</label>
                  <textarea
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono"
                    rows={16}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                  />
                </div>
              )}

              {tab === "channels" && (
                <div className="space-y-2">
                  {CHANNEL_OPTIONS.map((c) => (
                    <label key={c} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm capitalize">
                      <input
                        type="checkbox"
                        checked={!!channels[c]}
                        onChange={(e) => setChannels({ ...channels, [c]: e.target.checked })}
                      />
                      {c}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-xl border border-border bg-card p-4 h-fit sticky top-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Eye className="h-4 w-4 text-primary" /> Preview
            </div>
            <div className="space-y-2">
              <input
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={previewMsg}
                onChange={(e) => setPreviewMsg(e.target.value)}
                placeholder="Mensagem de teste..."
              />
              <button
                onClick={() => prevMut.mutate()}
                disabled={prevMut.isPending}
                className="w-full rounded-lg bg-secondary px-3 py-2 text-sm"
              >
                {prevMut.isPending ? "Testando..." : "Enviar teste"}
              </button>
            </div>
            {previewRes && (
              <div className="mt-3 space-y-2 text-xs">
                <div className="rounded-lg bg-secondary/50 p-2">
                  <span className="text-muted-foreground">Você:</span>
                  <p>{previewRes.user_message}</p>
                </div>
                <div className="rounded-lg bg-primary/10 p-2">
                  <span className="text-muted-foreground">{previewRes.agent_name}:</span>
                  <p>{previewRes.assistant_message}</p>
                </div>
                <p className="text-muted-foreground">
                  Tools: {(previewRes.tools_enabled || []).join(", ") || "nenhuma"} · Knowledge:{" "}
                  {previewRes.knowledge_loaded ? "sim" : "não"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
