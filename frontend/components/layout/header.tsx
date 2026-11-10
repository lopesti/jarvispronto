"use client";

import { Search, LogOut, Menu } from "lucide-react";
import { NotificationBell } from "./notification-bell";
import { useEffect, useState } from "react";
import { logout, type AuthUser } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useUIStore } from "@/stores/ui-store";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

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
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-card/80 px-3 backdrop-blur-md sm:h-16 sm:gap-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={toggleSidebar}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground md:hidden"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold tracking-tight text-foreground sm:text-lg">
            {title}
          </h2>
          {subtitle && (
            <p className="hidden truncate text-xs text-muted-foreground sm:block">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
        <div className="relative hidden lg:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Buscar conversa..."
            className="h-9 w-48 rounded-xl border border-border bg-secondary/50 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary xl:w-56"
          />
        </div>

        <NotificationBell />

        <div className="flex items-center gap-2 border-l border-border pl-2 sm:pl-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#00d4aa] to-[#67e8f9] text-[10px] font-bold text-[#0a0e17]">
            {initials}
          </div>
          <span className="hidden max-w-[8rem] truncate text-xs font-medium md:inline">
            {user?.name || "Operador"}
          </span>
          <button
            type="button"
            onClick={handleLogout}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground"
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
