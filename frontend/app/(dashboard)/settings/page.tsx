"use client";

import { Header } from "@/components/layout/header";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelSubscription,
  getBillingSubscription,
  subscribePlan,
} from "@/lib/api";
import Link from "next/link";
import { CreditCard, Sparkles } from "lucide-react";

export default function SettingsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["billing-subscription"],
    queryFn: getBillingSubscription,
  });

  const sub = data?.subscription;
  const checks = data?.checks;

  const upgrade = useMutation({
    mutationFn: (code: string) => subscribePlan(code, "monthly"),
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["billing-subscription"] });
      const url = data?.checkoutUrl || data?.invoiceUrl;
      if (url && typeof window !== "undefined") {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    },
  });

  const cancel = useMutation({
    mutationFn: cancelSubscription,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["billing-subscription"] }),
  });

  return (
    <>
      <Header title="Configurações" subtitle="WhatsApp, IA, plano e preferências" />
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-3xl">
        {/* Plano / Billing */}
        <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold">Plano e uso</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Gerencie assinatura, limites e upgrade
              </p>
            </div>
            <Link href="/planos" className="text-xs font-medium text-primary hover:underline">
              Ver planos
            </Link>
          </div>

          {isLoading && (
            <p className="mt-4 text-sm text-muted-foreground">Carregando...</p>
          )}

          {sub && (
            <div className="mt-5 space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-border bg-background p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Plano</div>
                  <div className="mt-1 text-lg font-bold">{sub.planName}</div>
                  <div className="text-xs text-muted-foreground capitalize">{sub.status}</div>
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Conversas</div>
                  <div className="mt-1 text-lg font-bold">
                    {checks?.conversations?.used ?? 0}
                    <span className="text-sm text-muted-foreground">
                      /{checks?.conversations?.limit === -1 ? "∞" : checks?.conversations?.limit ?? "—"}
                    </span>
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Ciclo</div>
                  <div className="mt-1 text-lg font-bold capitalize">{sub.billingCycle || "—"}</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {["prata", "gold", "diamante"].map((code) => (
                  <button
                    key={code}
                    type="button"
                    disabled={upgrade.isPending || sub.planCode === code}
                    onClick={() => upgrade.mutate(code)}
                    className="rounded-lg border border-border px-3 py-2 text-xs font-medium capitalize hover:border-primary hover:text-primary disabled:opacity-50"
                  >
                    {sub.planCode === code ? `Atual: ${code}` : `Ativar ${code}`}
                  </button>
                ))}
                {sub.status === "active" && !sub.cancelAtPeriodEnd && (
                  <button
                    type="button"
                    disabled={cancel.isPending}
                    onClick={() => cancel.mutate()}
                    className="rounded-lg border border-red-500/30 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10"
                  >
                    Cancelar no fim do período
                  </button>
                )}
              </div>
              {upgrade.isSuccess && (
                <p className="text-xs text-primary">Plano atualizado com sucesso.</p>
              )}
              {cancel.isSuccess && (
                <p className="text-xs text-amber-400">Cancelamento agendado para o fim do período.</p>
              )}
            </div>
          )}

          {!isLoading && !sub && (
            <div className="mt-4 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              Nenhuma assinatura encontrada.{" "}
              <Link href="/planos" className="text-primary hover:underline">
                Escolher um plano
              </Link>
            </div>
          )}
        </div>

        {/* WhatsApp */}
        <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <h3 className="text-sm font-semibold">Conexão WhatsApp</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Gerencie a sessão em <Link href="/channels" className="text-primary hover:underline">Canais</Link>
          </p>
        </div>

        {/* IA */}
        <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Inteligência Artificial</h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Prompt e tom de voz são configurados por empresa (companies.config).
            Em breve editor visual aqui.
          </p>
        </div>

        {/* Legal */}
        <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <h3 className="text-sm font-semibold">Legal</h3>
          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            <Link href="/termos" className="text-muted-foreground hover:text-primary">Termos de uso</Link>
            <Link href="/privacidade" className="text-muted-foreground hover:text-primary">Privacidade</Link>
            <Link href="/privacidade#lgpd" className="text-muted-foreground hover:text-primary">LGPD</Link>
          </div>
        </div>
      </div>
    </>
  );
}
