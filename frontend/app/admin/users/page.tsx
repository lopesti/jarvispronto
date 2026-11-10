"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Users, Search, Shield } from "lucide-react";

type AdminUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  is_superadmin: boolean;
  company_id: number | null;
  company_name: string | null;
  created_at: string;
};

export default function AdminUsersPage() {
  const [q, setQ] = useState("");

  const { data: users = [], isLoading } = useQuery<AdminUser[]>({
    queryKey: ["admin-users", q],
    queryFn: async () => {
      const { data } = await api.get("/api/admin/users", {
        params: q ? { q } : undefined,
      });
      return data;
    },
    refetchInterval: 30000,
  });

  const list = Array.isArray(users) ? users : [];

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-border px-6">
        <div>
          <h1 className="text-lg font-semibold">Usuários</h1>
          <p className="text-xs text-muted-foreground">
            Todos os usuários do sistema
          </p>
        </div>
      </header>

      <div className="page-scroll page-pad">
        <div className="mb-4 flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome, email ou ID..."
              className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-1.5 text-sm outline-none focus:border-primary"
            />
          </div>
          <span className="text-sm text-muted-foreground">
            {list.length} {list.length === 1 ? "usuário" : "usuários"}
          </span>
        </div>

        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl border border-border bg-card" />
            ))}
          </div>
        )}

        {!isLoading && list.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 py-16 text-center">
            <Users className="mb-3 h-8 w-8 text-muted-foreground" />
            <h3 className="mb-1 text-base font-semibold">Nenhum usuário</h3>
            <p className="text-sm text-muted-foreground">
              {q ? "Nenhum resultado para a busca." : "Nenhum usuário cadastrado."}
            </p>
          </div>
        )}

        {!isLoading && list.length > 0 && (
          <ul className="space-y-2">
            {list.map((u) => (
              <li
                key={u.id}
                className="rounded-xl border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium truncate">{u.name}</h3>
                      {u.is_superadmin && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-400">
                          <Shield className="h-2.5 w-2.5" />
                          SUPERADMIN
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground truncate">
                      {u.email}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {u.company_name || "sem empresa"} • role: {u.role || "user"} • #{u.id}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}