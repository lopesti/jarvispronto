"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * BUG-040 — valida o token (expiracao) antes de liberar o guard.
 *
 * Antes: so checava se `jarvis_token` existia no localStorage.
 * Agora:
 *  1. Se nao tem token -> /login
 *  2. Se token expirado E refresh valido -> renova via /auth/refresh
 *  3. Se token expirado E refresh invalido -> /login
 *  4. Se token valido -> libera
 */

function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    // base64url -> base64
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function isTokenValid(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload) return false;
  if (!payload.exp) return true; // sem exp = deixa passar
  // margem de 5s pra evitar corrida
  return Date.now() < payload.exp * 1000 - 5000;
}

function clearAuthStorage() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("jarvis_token");
  localStorage.removeItem("jarvis_refresh");
  localStorage.removeItem("jarvis_user");
}

async function tryRefresh(refreshToken: string): Promise<boolean> {
  try {
    const res = await fetch("/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    const access = data.accessToken || data.token;
    if (!access) return false;
    localStorage.setItem("jarvis_token", access);
    if (data.refreshToken) localStorage.setItem("jarvis_refresh", data.refreshToken);
    if (data.user) localStorage.setItem("jarvis_user", JSON.stringify(data.user));
    return true;
  } catch {
    return false;
  }
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const token = localStorage.getItem("jarvis_token");

      // 1. Sem token -> login
      if (!token) {
        if (!cancelled) router.replace("/login");
        return;
      }

      // 2. Token valido -> libera
      if (isTokenValid(token)) {
        if (!cancelled) setOk(true);
        return;
      }

      // 3. Token expirado: tenta refresh
      const refreshToken = localStorage.getItem("jarvis_refresh");
      if (refreshToken) {
        const refreshed = await tryRefresh(refreshToken);
        if (cancelled) return;
        if (refreshed) {
          setOk(true);
          return;
        }
      }

      // 4. Nada funcionou -> limpa e vai pro login
      if (cancelled) return;
      clearAuthStorage();
      router.replace("/login");
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  // Listener global: se o api.ts detectar 401 irrecuperavel em qualquer lugar,
  // ele redireciona com window.location. Aqui so cobrimos o boot.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "jarvis_token" && !e.newValue) {
        router.replace("/login");
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [router]);

  if (!ok) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Verificando autenticacao...
      </div>
    );
  }

  return <>{children}</>;
}