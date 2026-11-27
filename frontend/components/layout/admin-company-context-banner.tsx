"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, ArrowLeft } from "lucide-react";

type CompanyInfo = {
  id: number;
  name: string;
};

export function AdminCompanyContextBanner() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [company, setCompany] = useState<CompanyInfo | null>(null);

  useEffect(() => {
    function loadContext() {
      const raw = sessionStorage.getItem("jarvis_admin_company_info");

      if (!raw) {
        setCompany(null);
        return;
      }

      try {
        setCompany(JSON.parse(raw));
      } catch {
        sessionStorage.removeItem("jarvis_admin_company_info");
        sessionStorage.removeItem("jarvis_admin_company_context");
        setCompany(null);
      }
    }

    loadContext();

    window.addEventListener("jarvis-admin-context-changed", loadContext);
    window.addEventListener("storage", loadContext);

    return () => {
      window.removeEventListener("jarvis-admin-context-changed", loadContext);
      window.removeEventListener("storage", loadContext);
    };
  }, []);

  function returnToSuperadmin() {
    sessionStorage.removeItem("jarvis_admin_company_context");
    sessionStorage.removeItem("jarvis_admin_company_info");

    queryClient.clear();

    window.dispatchEvent(new Event("jarvis-admin-context-changed"));
    router.push("/admin/companies");
  }

  if (!company) return null;

  return (
    <div className="z-40 flex min-h-12 flex-wrap items-center justify-between gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2">
      <div className="flex items-center gap-2 text-sm">
        <ShieldCheck className="h-4 w-4 text-amber-600" />
        <span className="font-semibold">Modo SUPERADMIN</span>
        <span className="text-muted-foreground">· Acessando:</span>
        <span className="font-semibold">{company.name}</span>
        <span className="text-xs text-muted-foreground">
          (#{company.id})
        </span>
      </div>

      <button
        onClick={returnToSuperadmin}
        className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-secondary"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar ao SUPERADMIN
      </button>
    </div>
  );
}
