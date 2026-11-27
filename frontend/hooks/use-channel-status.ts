"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getChannelStatus, type ChannelStatus } from "@/lib/api";
import { useEffect, useRef } from "react";

export type ChannelsMap = {
  whatsapp?: ChannelStatus & { connected?: boolean; qrPending?: boolean; status?: string };
  [key: string]: ChannelStatus | undefined;
};

/**
 * Status de canais compartilhado (sidebar, overview, canais, etc.).
 * Poll rÃ¡pido enquanto WA nÃ£o estÃ¡ conectado; normal depois.
 */
export function useChannelStatus() {
  return useQuery({
    queryKey: ["channels"],
    queryFn: getChannelStatus as () => Promise<ChannelsMap>,
    refetchInterval: (query) => {
      const wa = query.state.data?.whatsapp as
        | { connected?: boolean; qrPending?: boolean; status?: string }
        | undefined;
      if (wa?.connected) return 30000;
      if (
        wa?.qrPending ||
        wa?.status === "qr" ||
        wa?.status === "connecting" ||
        wa?.status === "open"
      ) {
        return 3000;
      }
      // desconectado: ainda poll de 8s para pegar conexÃ£o feita em outra aba/pÃ¡gina
      return 8000;
    },
    staleTime: 2000,
  });
}

/** Quando o status WA muda para conectado, forÃ§a refresh global do cache. */
export function useSyncWhatsAppConnection(connected: boolean | undefined) {
  const qc = useQueryClient();
  const was = useRef<boolean | undefined>(undefined);

  useEffect(() => {
    if (connected === true && was.current !== true) {
      qc.invalidateQueries({ queryKey: ["channels"] });
      qc.invalidateQueries({ queryKey: ["whatsapp-status"] });
    }
    was.current = connected;
  }, [connected, qc]);
}

