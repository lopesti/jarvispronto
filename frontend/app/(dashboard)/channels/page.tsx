"use client";

import { Header } from "@/components/layout/header";
import { useQuery } from "@tanstack/react-query";
import { getChannelStatus, type ChannelStatus } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Radio, ExternalLink, CheckCircle2, Circle } from "lucide-react";

const PRIMARY = ["whatsapp", "instagram", "facebook"] as const;
const ROADMAP = ["mercadolivre", "shopee", "tiktok", "youtube"] as const;

function StatusDot({ ch }: { ch?: ChannelStatus }) {
  const connected = !!ch?.connected || ch?.status === "connected";
  const pending =
    ch?.qrPending ||
    ch?.status === "qr_pending" ||
    ch?.status === "pending_credentials";
  return (
    <span
      className={cn(
        "h-2.5 w-2.5 rounded-full",
        connected
          ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"
          : pending
            ? "bg-amber-400 animate-pulse"
            : "bg-muted-foreground/35"
      )}
    />
  );
}

function ChannelCard({
  id,
  ch,
  primary,
}: {
  id: string;
  ch?: ChannelStatus;
  primary?: boolean;
}) {
  const label = ch?.label || id;
  const connected = !!ch?.connected || ch?.status === "connected";
  const isWa = id === "whatsapp";

  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-5 transition-colors",
        primary ? "border-border" : "border-border/60 opacity-90"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold capitalize">{label}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {ch?.note || "—"}
          </p>
        </div>
        <StatusDot ch={ch} />
      </div>

      <p className="mt-3 text-[11px] uppercase tracking-wide text-muted-foreground">
        Status:{" "}
        <span className="text-foreground normal-case">
          {ch?.status || "—"}
        </span>
      </p>

      {isWa && (
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href="/qr"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            {connected ? "Ver sessão" : "Conectar / QR"}
            <ExternalLink className="h-3 w-3" />
          </a>
          {!connected && (
            <span className="inline-flex items-center gap-1 text-[11px] text-amber-200/90">
              <Circle className="h-3 w-3" /> Escaneie o QR no celular
            </span>
          )}
          {connected && (
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300/90">
              <CheckCircle2 className="h-3 w-3" /> Pronto para o funil
            </span>
          )}
        </div>
      )}

      {(id === "instagram" || id === "facebook") && !ch?.enabled && (
        <p className="mt-3 text-[11px] text-muted-foreground">
          2º canal do TCC — configure META_* no .env
        </p>
      )}
    </div>
  );
}

export default function ChannelsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["channels"],
    queryFn: getChannelStatus,
    refetchInterval: 12000,
  });

  const waOk = !!data?.whatsapp?.connected;

  return (
    <>
      <Header
        title="Canais"
        subtitle="WhatsApp ativo · Instagram/Messenger preparados · demais no roadmap"
      />
      <div className="flex-1 overflow-y-auto p-6">
        {!waOk && !isLoading && (
          <div className="mb-6 flex flex-col items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 sm:flex-row sm:items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-card">
              <Radio className="h-6 w-6 text-amber-300" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">
                Conecte-se a um canal para que as mensagens apareçam no inbox
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Com o SaleSmartly em mente: um CTA claro. No Jarvis o canal
                principal é o WhatsApp (Baileys). Instagram/Messenger usam o
                mesmo funil quando o Meta estiver configurado.
              </p>
            </div>
            <a
              href="/qr"
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              Conectar WhatsApp
            </a>
          </div>
        )}

        {isLoading && (
          <p className="text-sm text-muted-foreground">Carregando status...</p>
        )}

        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Canais do TCC
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PRIMARY.map((key) => (
            <ChannelCard key={key} id={key} ch={data?.[key]} primary />
          ))}
        </div>

        <p className="mb-3 mt-8 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Roadmap
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ROADMAP.map((key) => (
            <ChannelCard key={key} id={key} ch={data?.[key]} />
          ))}
        </div>

        <div className="mt-8 rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">
            Ativar Instagram / Messenger (2º canal)
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs">
            <li>Crie um app em developers.facebook.com</li>
            <li>
              Defina no .env: META_VERIFY_TOKEN, META_PAGE_ACCESS_TOKEN
            </li>
            <li>
              Webhook: GET/POST https://seu-dominio/api/channels/meta/webhook
            </li>
            <li>Reinicie a API — o mesmo funil/score/handoff vale nos dois canais</li>
          </ol>
        </div>
      </div>
    </>
  );
}
