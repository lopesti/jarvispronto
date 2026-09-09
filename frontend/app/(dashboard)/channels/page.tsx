"use client";

import { Header } from "@/components/layout/header";
import { useQuery } from "@tanstack/react-query";
import { getChannelStatus } from "@/lib/api";

const ORDER = [
  "whatsapp",
  "instagram",
  "facebook",
  "mercadolivre",
  "shopee",
  "tiktok",
  "youtube",
];

export default function ChannelsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["channels"],
    queryFn: getChannelStatus,
    refetchInterval: 20000,
  });

  return (
    <>
      <Header
        title="Canais"
        subtitle="WhatsApp ativo · Meta (IG/FB) com webhook preparado · demais na roadmap"
      />
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading && (
          <p className="text-sm text-muted-foreground">Carregando status...</p>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ORDER.map((key) => {
            const ch = data?.[key];
            return (
              <div
                key={key}
                className="rounded-xl border border-border bg-card p-5"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold capitalize">{key}</h3>
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      ch?.enabled ? "bg-primary" : "bg-muted-foreground/40"
                    }`}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Status: {ch?.status || "—"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {ch?.note || ""}
                </p>
              </div>
            );
          })}
        </div>
        <div className="mt-8 rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Ativar Instagram / Facebook</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Crie um app em developers.facebook.com</li>
            <li>
              Defina no .env: META_VERIFY_TOKEN, META_PAGE_ACCESS_TOKEN
            </li>
            <li>
              Webhook: POST/GET https://seu-dominio/api/channels/meta/webhook
            </li>
            <li>Reinicie a API</li>
          </ol>
        </div>
      </div>
    </>
  );
}
