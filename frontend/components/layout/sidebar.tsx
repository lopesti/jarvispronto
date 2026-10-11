"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  GitBranch,
  Users,
  Settings,
  Bot,
  Radio,
  Package,
  AlertCircle,
  LifeBuoy,
  Shield,
  Zap,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";
import { useQuery } from "@tanstack/react-query";
import { getChannelStatus, getConversations, isSuperadmin } from "@/lib/api";
import { getTickets } from "@/lib/support-api";
import { useState, useEffect } from "react";
import { useUIStore } from "@/stores/ui-store";

const navItems = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/conversations", label: "Conversas", icon: MessageSquare },
  { href: "/pipeline", label: "Funil", icon: GitBranch },
  { href: "/automations", label: "Automações", icon: Zap },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/channels", label: "Canais", icon: Radio },
  { href: "/produtos", label: "Produtos", icon: Package },
  { href: "/support", label: "Suporte", icon: LifeBuoy },
  { href: "/settings", label: "Configurações", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [superadmin, setSuperadmin] = useState(false);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);

  useEffect(() => {
    setSuperadmin(isSuperadmin());
  }, []);

  // Fecha drawer ao navegar (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname, setSidebarOpen]);

  // Desktop: sidebar sempre “aberta” visualmente; mobile usa estado
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => {
      if (mq.matches) setSidebarOpen(false); // no mobile state, desktop ignores
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [setSidebarOpen]);

  const { data: channels } = useQuery({
    queryKey: ["channels"],
    queryFn: getChannelStatus,
    refetchInterval: 15000,
  });

  const { data: needsList = [] } = useQuery({
    queryKey: ["conversations", "needs_human"],
    queryFn: () => getConversations({ filter: "needs_human" }),
    refetchInterval: 10000,
  });

  const { data: tickets = [] } = useQuery({
    queryKey: ["support-tickets"],
    queryFn: getTickets,
    refetchInterval: 15000,
  });

  const wa = channels?.whatsapp;
  const waConnected = !!wa?.connected;
  const waQr = !!wa?.qrPending;
  const channelOk = waConnected;
  const needsCount = Array.isArray(needsList) ? needsList.length : 0;
  const ticketsList = Array.isArray(tickets) ? tickets : [];
  const ticketsUnread = ticketsList.reduce(
    (acc, t) => acc + Number(t.unread_count || 0),
    0
  );

  const nav = (
    <>
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4 sm:h-16 sm:px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#00d4aa] to-[#67e8f9] shadow-lg shadow-[#00d4aa]/20">
          <Bot className="h-5 w-5 text-[#0a0e17]" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-extrabold tracking-tight">JARVIS</h1>
          <p className="truncate text-[10px] text-muted-foreground">CRM · WhatsApp · IA</p>
        </div>
        <ThemeToggle />
        <button
          type="button"
          className="rounded-lg p-2 text-muted-foreground hover:bg-secondary md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Fechar menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="border-b border-border px-3 py-3 sm:px-4">
        {channelOk ? (
          <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-xs text-primary">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            WhatsApp conectado
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              {waQr
                ? "QR pendente — vá em Canais"
                : "Conecte o WhatsApp em Canais"}
            </span>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2 sm:p-3">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          const showNeedsBadge = item.href === "/conversations" && needsCount > 0;
          const showSupportBadge = item.href === "/support" && ticketsUnread > 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                isActive
                  ? "bg-primary/15 font-medium text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {showNeedsBadge && (
                <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                  {needsCount}
                </span>
              )}
              {showSupportBadge && (
                <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                  {ticketsUnread}
                </span>
              )}
            </Link>
          );
        })}

        {superadmin && (
          <>
            <div className="my-2 border-t border-border" />
            <Link
              href="/admin"
              className={cn(
                "flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                pathname.startsWith("/admin")
                  ? "bg-red-500/15 font-medium text-red-400"
                  : "text-muted-foreground hover:bg-red-500/10 hover:text-red-400"
              )}
            >
              <Shield className="h-4 w-4 shrink-0" />
              <span className="flex-1">Painel Admin</span>
              <span className="rounded-full bg-red-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-red-400">
                ADMIN
              </span>
            </Link>
          </>
        )}
      </nav>

      <div className="border-t border-border p-3 text-[10px] text-muted-foreground sm:p-4">
        Jarvis CRM · multi-empresa
      </div>
    </>
  );

  return (
    <>
      {/* Overlay mobile */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity md:hidden",
          sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => setSidebarOpen(false)}
        aria-hidden={!sidebarOpen}
      />

      {/* Drawer mobile */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(18rem,88vw)] flex-col border-r border-border bg-card shadow-2xl transition-transform duration-300 ease-out md:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {nav}
      </aside>

      {/* Sidebar desktop */}
      <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-card md:flex">
        {nav}
      </aside>
    </>
  );
}
