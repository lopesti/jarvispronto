"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

function clearAuthStorage(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem("jarvis_token");
  sessionStorage.removeItem("jarvis_refresh");
  localStorage.removeItem("jarvis_token");
  localStorage.removeItem("jarvis_refresh");
  localStorage.removeItem("jarvis_user");
}

async function checkMe(): Promise<boolean> {
  try {
    const res = await fetch("/auth/me", {
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.user) {
        try {
          sessionStorage.setItem("jarvis_user", JSON.stringify(data.user));
          localStorage.setItem("jarvis_user", JSON.stringify(data.user));
        } catch (_) {}
        return true;
      }
    }
    return false;
  } catch (_) {
    return false;
  }
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken =
    (typeof window !== "undefined" &&
      (sessionStorage.getItem("jarvis_refresh") ||
        localStorage.getItem("jarvis_refresh"))) ||
    undefined;
  try {
    const res = await fetch("/auth/refresh", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(refreshToken ? { refreshToken } : {}),
    });
    if (!res.ok) return false;
    const data = await res.json();
    const access = data.accessToken || data.token;
    if (access && typeof window !== "undefined") {
      sessionStorage.setItem("jarvis_token", access);
      localStorage.removeItem("jarvis_token");
    }
    if (data.refreshToken && typeof window !== "undefined") {
      sessionStorage.setItem("jarvis_refresh", data.refreshToken);
      localStorage.removeItem("jarvis_refresh");
    }
    if (data.user && typeof window !== "undefined") {
      sessionStorage.setItem("jarvis_user", JSON.stringify(data.user));
      localStorage.setItem("jarvis_user", JSON.stringify(data.user));
    }
    return true;
  } catch (_) {
    return false;
  }
}

export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      let authenticated = await checkMe();
      if (cancelled) return;

      if (!authenticated) {
        const refreshed = await tryRefresh();
        if (cancelled) return;
        if (refreshed) {
          authenticated = await checkMe();
          if (cancelled) return;
        }
      }

      if (authenticated) {
        setOk(true);
        return;
      }

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