"use client";

import { Bell, Search, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { logout, type AuthUser } from "@/lib/api";
import { useRouter } from "next/navigation";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("jarvis_user");
      if (raw) setUser(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  const initials =
    user?.name
      ?.split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "JV";

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card/50 px-6 backdrop-blur">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar conversa..."
            className="h-9 w-56 rounded-lg border border-border bg-secondary/50 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <button
          type="button"
          className="relative rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
          aria-label="Notificacoes"
        >
          <Bell className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 border-l border-border pl-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
            {initials}
          </div>
          <span className="hidden max-w-[120px] truncate text-sm text-foreground sm:block">
            {user?.name || "Operador"}
          </span>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
