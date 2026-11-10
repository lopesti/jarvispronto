"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import {
  getVapidPublicKey,
  subscribePush,
  unsubscribePush,
  testPush,
} from "@/lib/api";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function PushOptIn() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const ok =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    setSupported(ok);
    if (ok) setPermission(Notification.permission);
  }, []);

  async function enable() {
    setLoading(true);
    setMsg("");
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        setMsg("Permissão negada pelo navegador.");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const { publicKey } = await getVapidPublicKey();
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      await subscribePush(sub.toJSON());
      setSubscribed(true);
      setMsg("Push ativado neste dispositivo.");
    } catch (e: unknown) {
      setMsg((e as Error)?.message || "Falha ao ativar push.");
    } finally {
      setLoading(false);
    }
  }

  async function disable() {
    setLoading(true);
    setMsg("");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await unsubscribePush(sub.endpoint);
        await sub.unsubscribe();
      }
      setSubscribed(false);
      setMsg("Push desativado neste dispositivo.");
    } catch (e: unknown) {
      setMsg((e as Error)?.message || "Falha ao desativar.");
    } finally {
      setLoading(false);
    }
  }

  async function sendTest() {
    setLoading(true);
    setMsg("");
    try {
      const r = await testPush();
      setMsg(`Teste enviado (ok: ${r.sent}, falha: ${r.failed}).`);
    } catch (e: unknown) {
      setMsg((e as Error)?.message || "Falha no teste.");
    } finally {
      setLoading(false);
    }
  }

  if (!supported) {
    return (
      <p className="text-xs text-muted-foreground">
        Este navegador não suporta Web Push.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Receba alertas mesmo com o painel em segundo plano (follow-ups atrasados,
        etc.).
      </p>
      <div className="flex flex-wrap gap-2">
        {!subscribed ? (
          <button
            type="button"
            onClick={enable}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
            Ativar notificações
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={sendTest}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              Enviar teste
            </button>
            <button
              type="button"
              onClick={disable}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground disabled:opacity-50"
            >
              <BellOff className="h-4 w-4" /> Desativar
            </button>
          </>
        )}
      </div>
      {permission === "denied" && (
        <p className="text-xs text-amber-400">
          Bloqueado nas configurações do navegador — permita notificações para este site.
        </p>
      )}
      {msg && <p className="text-xs text-primary">{msg}</p>}
    </div>
  );
}
