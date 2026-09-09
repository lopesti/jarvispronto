"use client";

import { Header } from "@/components/layout/header";
import { useQuery } from "@tanstack/react-query";
import { getLeads } from "@/lib/api";

export default function LeadsPage() {
  // ✅ CORREÇÃO: queryFn agora usa async/await
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const result = await getLeads();
      return result;
    },
    refetchInterval: 10000,
  });

  const list = Array.isArray(leads) ? leads : [];

  return (
    <>
      <Header title="Leads" subtitle="Leads gerados pelo WhatsApp" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-card text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Telefone</th>
                <th className="px-4 py-3 font-medium">Score</th>
                <th className="px-4 py-3 font-medium">Etapa</th>
                <th className="px-4 py-3 font-medium">Msgs</th>
                <th className="px-4 py-3 font-medium">Ultima mensagem</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-muted-foreground">
                    Carregando...
                  </td>
                </tr>
              )}
              {!isLoading && list.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-muted-foreground">
                    Nenhum lead ainda.
                  </td>
                </tr>
              )}
              {list.map((lead) => (
                <tr
                  key={lead.phone}
                  className="border-b border-border hover:bg-secondary/30 transition-colors"
                >
                  <td className="px-4 py-3 font-medium">{lead.name}</td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-primary/15 px-2 py-0.5 text-xs text-primary font-medium">
                      {lead.score}
                    </span>
                  </td>
                  <td className="px-4 py-3">{lead.stage}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {lead.messageCount}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">
                    {lead.lastMessage || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-xs text-green-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                      {lead.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}