"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * BUG-040 + fix login loop:
 * O login grava o access token em sessionStorage (api.ts storeAuth).
 * O guard precisa ler sessionStorage PRIMEIRO, depois localStorage.
 */

function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
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
  if (!payload.exp) return true;
  return Date.now() < payload.exp * 1000 - 5000;
}

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    sessionStorage.getItem("jarvis_token") ||
    localStorage.getItem("jarvis_token")
  );
}

function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    sessionStorage.getItem("jarvis_refresh") ||
    localStorage.getItem("jarvis_refresh")
  );
}

function clearAuthStorage() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem("jarvis_token");
  sessionStorage.removeItem("jarvis_refresh");
  sessionStorage.removeItem("jarvis_user");
  localStorage.removeItem("jarvis_token");
  localStorage.removeItem("jarvis_refresh");
  localStorage.removeItem("jarvis_user");
}

async function tryRefresh(refreshToken: string): Promise<boolean> {
  try {
    const res = await fetch("/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    const access = data.accessToken || data.token;
    if (!access) return false;
    sessionStorage.setItem("jarvis_token", access);
    localStorage.removeItem("jarvis_token");
    if (data.refreshToken) {
      sessionStorage.setItem("jarvis_refresh", data.refreshToken);
      localStorage.setItem("jarvis_refresh", data.refreshToken);
    }
    if (data.user) {
      sessionStorage.setItem("jarvis_user", JSON.stringify(data.user));
      localStorage.setItem("jarvis_user", JSON.stringify(data.user));
    }
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
      const token = getAccessToken();

      if (!token) {
        if (!cancelled) router.replace("/login");
        return;
      }

      if (isTokenValid(token)) {
        if (!cancelled) setOk(true);
        return;
      }

      const refreshToken = getRefreshToken();
      if (refreshToken) {
        const refreshed = await tryRefresh(refreshToken);
        if (cancelled) return;
        if (refreshed) {
          setOk(true);
          return;
        }
      }

      if (cancelled) return;
      clearAuthStorage();
      router.replace("/login");
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "jarvis_token" && !e.newValue) {
        if (!sessionStorage.getItem("jarvis_token")) {
          router.replace("/login");
        }
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
