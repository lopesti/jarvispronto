"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getBillingSubscription } from "@/lib/api";
import { AlertTriangle, Sparkles, Zap } from "lucide-react";

function daysLeft(iso?: string | null) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

function pct(used: number, limit: number) {
  if (!limit || limit < 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

export function UsageBanner() {
  const { data } = useQuery({
    queryKey: ["billing-subscription"],
    queryFn: getBillingSubscription,
    refetchInterval: 60000,
    retry: 1,
  });

  if (!data?.subscription) return null;

  const sub = data.subscription;
  const conv = data.checks?.conversations;
  const trialDays = daysLeft(sub.trialEndsAt);
  const isTrial = sub.status === "trial";
  const limitAlmost =
    conv && conv.limit > 0 && conv.used / conv.limit >= 0.8;

  if (!isTrial && !limitAlmost) {
    // mini chip de uso no canto — só mostra se trial ou perto do limite
    return null;
  }

  return (
    <div className="space-y-2 px-4 pt-4 md:px-6">
      {isTrial && (
        <div className="flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary/10 p-4 sm:flex-row sm:items-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">
              Trial ativo
              {trialDays !== null ? ` · ${trialDays} dia${trialDays === 1 ? "" : "s"} restante${trialDays === 1 ? "" : "s"}` : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              Plano {sub.planName || "Trial"}. Faça upgrade para não interromper o funil.
            </p>
          </div>
          <Link
            href="/planos"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Ver planos
          </Link>
        </div>
      )}

      {limitAlmost && conv && (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 sm:flex-row sm:items-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">
              Uso de conversas: {conv.used}/{conv.limit === -1 ? "∞" : conv.limit} ({pct(conv.used, conv.limit)}%)
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-amber-400 transition-all"
                style={{ width: `${pct(conv.used, conv.limit)}%` }}
              />
            </div>
          </div>
          <Link
            href="/planos"
            className="inline-flex items-center gap-1 rounded-lg border border-amber-500/40 px-4 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/10"
          >
            <Zap className="h-3.5 w-3.5" /> Upgrade
          </Link>
        </div>
      )}
    </div>
  );
}
