"use client";

import { Header } from "@/components/layout/header";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiMutation } from "@/lib/use-api-mutation";
import { useState } from "react";
import {
  getChannelStatus,
  getWhatsAppStatus,
  connectWhatsApp,
  disconnectWhatsApp,
  getWhatsAppQr,
  type ChannelStatus,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Radio,
  CheckCircle2,
  Circle,
  X,
  Loader2,
  RefreshCw,
  LogOut,
} from "lucide-react";

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

function WhatsQrModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();

  const { data: status, isLoading } = useQuery({
    queryKey: ["whatsapp-status"],
    queryFn: getWhatsAppStatus,
    refetchInterval: 3000,
  });

  const { data: qrData } = useQuery({
    queryKey: ["whatsapp-qr"],
    queryFn: getWhatsAppQr,
    enabled: status?.hasQr === true,
    refetchInterval: 25000,
  });

  const connectMut = useApiMutation({
    mutationFn: connectWhatsApp,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["whatsapp-status"] }),
    successMessage: "Conexao iniciada, aguarde o QR",
  });

  const disconnectMut = useApiMutation({
    mutationFn: () => disconnectWhatsApp(false),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["whatsapp-status"] }),
    successMessage: "WhatsApp desconectado",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Conectar WhatsApp</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 hover:bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {status?.connected ? (
          <div className="space-y-4 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
            <p className="text-sm font-medium">WhatsApp conectado</p>
            <p className="text-xs text-muted-foreground">
              Empresa #{status.companyId}
            </p>
            <button
              onClick={() => disconnectMut.mutate()}
              disabled={disconnectMut.isPending}
              className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 disabled:opacity-60"
            >
              <LogOut className="h-3.5 w-3.5" />
              Desconectar
            </button>
          </div>
        ) : !status?.hasQr ? (
          <div className="space-y-4 text-center">
            <Radio className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Clique abaixo para iniciar uma sessao e gerar o QR Code.
            </p>
            <button
              onClick={() => connectMut.mutate()}
              disabled={connectMut.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {connectMut.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Iniciar conexao
            </button>
          </div>
        ) : qrData?.qrImage ? (
          <div className="space-y-4 text-center">
            <div className="mx-auto w-fit rounded-lg bg-white p-4">
              <img src={qrData.qrImage} alt="QR Code" className="h-64 w-64" />
            </div>
            <p className="text-xs text-muted-foreground">
              Abra o WhatsApp no celular - Aparelhos conectados - Conectar
              aparelho - Aponte para o QR
            </p>
            <p className="text-[11px] text-muted-foreground">
              O QR atualiza automaticamente a cada 25s.
            </p>
          </div>
        ) : (
          <div className="space-y-4 text-center">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Gerando QR Code...</p>
          </div>
        )}

        {isLoading && !status && (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Consultando estado...
          </p>
        )}
      </div>
    </div>
  );
}

function ChannelCard({
  id,
  ch,
  primary,
  onConnectWhatsApp,
}: {
  id: string;
  ch?: ChannelStatus;
  primary?: boolean;
  onConnectWhatsApp?: () => void;
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
          <p className="mt-1 text-xs text-muted-foreground">{ch?.note || "-"}</p>
        </div>
        <StatusDot ch={ch} />
      </div>

      <p className="mt-3 text-[11px] uppercase tracking-wide text-muted-foreground">
        Status:{" "}
        <span className="text-foreground normal-case">
          {ch?.status || "-"}
        </span>
      </p>

      {isWa && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onConnectWhatsApp}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            {connected ? "Gerenciar sessao" : "Conectar WhatsApp"}
          </button>
          {!connected && (
            <span className="inline-flex items-center gap-1 text-[11px] text-amber-200/90">
              <Circle className="h-3 w-3" /> Escaneie o QR dentro do painel
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
        <p className="mt-3 text-[11px] text-muted-foreground italic">
          Nao disponivel nesta versao.
        </p>
      )}
    </div>
  );
}

export default function ChannelsPage() {
  const [showQrModal, setShowQrModal] = useState(false);
  const qc = useQueryClient();

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
        subtitle="WhatsApp ativo - Instagram/Messenger no roadmap - demais em breve"
      />
      <div className="flex-1 overflow-y-auto p-6">
        {!waOk && !isLoading && (
          <div className="mb-6 flex flex-col items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 sm:flex-row sm:items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-card">
              <Radio className="h-6 w-6 text-amber-300" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">
                Conecte-se a um canal para que as mensagens aparecam no inbox
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                O QR Code e gerado dentro do painel. Clique em "Conectar
                WhatsApp", escaneie com o celular e pronto.
              </p>
            </div>
            <button
              onClick={() => setShowQrModal(true)}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              Conectar WhatsApp
            </button>
          </div>
        )}

        {isLoading && (
          <p className="text-sm text-muted-foreground">Carregando status...</p>
        )}

        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Canais do TCC
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PRIMARY
            .filter((key) => {
              // BUG-053: so mostra Meta se o backend confirmar que esta configurado
              if (key === "whatsapp") return true;
              return data?.[key]?.enabled === true;
            })
            .map((key) => (
              <ChannelCard
                key={key}
                id={key}
                ch={data?.[key]}
                primary
                onConnectWhatsApp={
                  key === "whatsapp" ? () => setShowQrModal(true) : undefined
                }
              />
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
            Instagram / Messenger
          </p>
          <p className="mt-2 text-xs">
            Disponibilidade prevista para uma proxima versao. Quando liberado,
            o mesmo funil/score/handoff valera nos dois canais.
          </p>
        </div>
      </div>

      {showQrModal && (
        <WhatsQrModal
          onClose={() => {
            setShowQrModal(false);
            qc.invalidateQueries({ queryKey: ["channels"] });
          }}
        />
      )}
    </>
  );
}