"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Tenta pegar o token de qualquer um dos dois lugares
      const token = 
        localStorage.getItem("jarvis_token") || 
        sessionStorage.getItem("jarvis_token");

      // 1. Sem token -> login
      if (!token) {
        if (!cancelled) router.replace("/login");
        return;
      }

      // 2. Token valido -> libera
      if (isTokenValid(token)) {
        // Sincroniza para o localStorage caso ele esteja no sessionStorage
        localStorage.setItem("jarvis_token", token);
        const refresh = sessionStorage.getItem("jarvis_refresh");
        if (refresh) localStorage.setItem("jarvis_refresh", refresh);
        
        if (!cancelled) setOk(true);
        return;
      }

      // 3. Token expirado -> limpa e vai pro login
      // (Se o token expirar, o próprio api.ts tenta o refresh de forma transparente. 
      // O guard não precisa se preocupar com isso agora para não travar no Nginx).
      localStorage.removeItem("jarvis_token");
      sessionStorage.removeItem("jarvis_token");
      
      if (!cancelled) router.replace("/login");
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ok) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Verificando autenticação...
      </div>
    );
  }

  return <>{children}</>;
}