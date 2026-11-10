"use client";

import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

type NotifPayload = {
  id?: number;
  type?: string;
  title?: string;
  body?: string | null;
  [key: string]: unknown;
};

export function useRealtimeNotifications(onEvent?: (n: NotifPayload) => void) {
  const qc = useQueryClient();
  const esRef = useRef<EventSource | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const connect = useCallback(() => {
    if (typeof window === "undefined") return;
    if (esRef.current) {
      try {
        esRef.current.close();
      } catch (_) {}
      esRef.current = null;
    }

    const token =
      localStorage.getItem("jarvis_token") ||
      localStorage.getItem("token") ||
      "";
    if (!token) return;

    const base = process.env.NEXT_PUBLIC_API_URL || "";
    const url = `${base}/api/crm/notifications/stream?token=${encodeURIComponent(token)}`;

    const es = new EventSource(url);
    esRef.current = es;

    es.addEventListener("notification", (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data) as NotifPayload;
        qc.invalidateQueries({ queryKey: ["notifications"] });
        qc.invalidateQueries({ queryKey: ["lead-tasks"] });
        onEventRef.current?.(data);
      } catch (_) {}
    });

    es.onerror = () => {
      es.close();
      esRef.current = null;
      setTimeout(connect, 5000);
    };
  }, [qc]);

  useEffect(() => {
    connect();
    return () => {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, [connect]);
}
