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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";
import { useQuery } from "@tanstack/react-query";
import { getChannelStatus, getConversations } from "@/lib/api";

const navItems = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/conversations", label: "Conversas", icon: MessageSquare },
  { href: "/pipeline", label: "Funil", icon: GitBranch },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/channels", label: "Canais", icon: Radio },
  { href: "/produtos", label: "Produtos", icon: Package },
  { href: "/settings", label: "Configuracoes", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

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

  const wa = channels?.whatsapp;
  const waConnected = !!wa?.connected;
  const waQr = !!wa?.qrPending;
  const channelOk = waConnected;
  const needsCount = Array.isArray(needsList) ? needsList.length : 0;

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-border bg-card">
      <div className="flex h-16 items-center gap-3 border-b border-border px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20">
          <Bot className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold tracking-wide">JARVIS</h1>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Vendas conversacionais
          </p>
        </div>
        <ThemeToggle />
      </div>

      {/* Status do canal — inspirado SaleSmartly */}
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 rounded-lg bg-secondary/60 px-3 py-2">
          <span
            className={cn(
              "h-2 w-2 shrink-0 rounded-full",
              waConnected
                ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"
                : waQr
                  ? "bg-amber-400 animate-pulse"
                  : "bg-muted-foreground/50"
            )}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">
              WhatsApp{" "}
              {waConnected ? "conectado" : waQr ? "QR pendente" : "desconectado"}
            </p>
            {!channelOk && (
              <Link
                href="/channels"
                className="text-[10px] text-primary hover:underline"
              >
                Conectar canal →
              </Link>
            )}
          </div>
        </div>
        {!channelOk && (
          <div className="mt-2 flex items-start gap-1.5 rounded-md bg-amber-500/10 px-2 py-1.5 text-[10px] text-amber-200/90">
            <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
            <span>Conecte o WhatsApp para receber mensagens no funil.</span>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          const showBadge =
            item.href === "/conversations" && needsCount > 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                isActive
                  ? "bg-primary/15 text-primary font-medium"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {showBadge && (
                <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                  {needsCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-4 text-[10px] text-muted-foreground">
        TCC · Funil + score + handoff
      </div>
    </aside>
  );
}
