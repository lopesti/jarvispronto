"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import {
  getNotifications,
  markNotificationsRead,
  type AppNotification,
} from "@/lib/api";
import { useRealtimeNotifications } from "@/hooks/use-realtime-notifications";
import { useRouter } from "next/navigation";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const qc = useQueryClient();
  const router = useRouter();

  const { data: list = [] } = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: () => getNotifications(true),
    refetchInterval: 60000,
  });

  const unread = Array.isArray(list) ? list : [];

  useRealtimeNotifications((n) => {
    setToast(n.title || "Nova notificação");
    setTimeout(() => setToast(null), 4000);
  });

  async function markAll() {
    await markNotificationsRead();
    qc.invalidateQueries({ queryKey: ["notifications"] });
  }

  function openItem(n: AppNotification) {
    const type = n.type || "";
    if (type.startsWith("task.")) router.push("/tasks");
    else if (type.startsWith("whatsapp.")) router.push("/channels");
    else router.push("/overview");
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground"
        aria-label="Notificações"
      >
        <Bell className="h-5 w-5" />
        {unread.length > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <span className="text-xs font-semibold">Notificações</span>
              {unread.length > 0 && (
                <button
                  type="button"
                  onClick={markAll}
                  className="text-[10px] font-medium text-primary"
                >
                  Marcar todas
                </button>
              )}
            </div>
            <div className="max-h-72 overflow-y-auto">
              {unread.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                  Nenhuma notificação nova
                </p>
              ) : (
                unread.slice(0, 20).map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => openItem(n)}
                    className="block w-full border-b border-border/50 px-3 py-2.5 text-left hover:bg-secondary/50"
                  >
                    <p className="text-xs font-semibold">{n.title}</p>
                    {n.body && (
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                        {n.body}
                      </p>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {toast && (
        <div className="fixed bottom-4 right-4 z-[60] max-w-sm rounded-xl border border-primary/30 bg-card px-4 py-3 text-sm shadow-lg">
          <p className="font-semibold text-primary">JARVIS</p>
          <p className="text-xs text-muted-foreground">{toast}</p>
        </div>
      )}
    </div>
  );
}
