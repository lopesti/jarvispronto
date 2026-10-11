"use client";

import { useMemo, useState } from "react";
import { Header } from "@/components/layout/header";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createLeadTask,
  getConversations,
  getLeadTasks,
  getNotifications,
  markNotificationsRead,
  checkOverdueTasksNow,
  updateLeadTask,
  type LeadTask,
} from "@/lib/api";
import { EmptyState } from "@/components/ui/empty-state";
import { CheckCircle2, Circle, Plus, ListTodo, AlertTriangle, Bell } from "lucide-react";

function fmtDue(iso?: string | null) {
  if (!iso) return "Sem prazo";
  const d = new Date(iso);
  const today = new Date();
  const isOverdue = d.getTime() < today.getTime();
  const label = d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  return isOverdue ? `Atrasada · ${label}` : label;
}

export default function TasksPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<"open" | "done" | "all">("open");
  const [phone, setPhone] = useState("");
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [priority, setPriority] = useState("medium");

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["lead-tasks", status],
    queryFn: () => getLeadTasks({ status }),
    refetchInterval: 15000,
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => getConversations(),
  });

  const { data: notifications = [], refetch: refetchNotif } = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: () => getNotifications(true),
    refetchInterval: 30000,
  });

  const overdueNotifs = (Array.isArray(notifications) ? notifications : []).filter(
    (n) => n.type === "task.overdue"
  );

  const runCheckMut = useMutation({
    mutationFn: checkOverdueTasksNow,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["lead-tasks"] });
    },
  });

  const markReadMut = useMutation({
    mutationFn: () => markNotificationsRead(overdueNotifs.map((n) => n.id)),
    onSuccess: () => refetchNotif(),
  });

  const phones = useMemo(() => {
    const list = Array.isArray(conversations) ? conversations : [];
    return list.map((c) => ({
      phone: c.phone,
      label:
        c.display_name ||
        c.phone.replace("@s.whatsapp.net", "").replace(/^(instagram|facebook):/, ""),
    }));
  }, [conversations]);

  const createMut = useMutation({
    mutationFn: () =>
      createLeadTask({
        phone,
        title: title.trim(),
        due_at: due ? new Date(due).toISOString() : null,
        priority,
      }),
    onSuccess: () => {
      setTitle("");
      setDue("");
      qc.invalidateQueries({ queryKey: ["lead-tasks"] });
    },
  });

  const toggleMut = useMutation({
    mutationFn: (t: LeadTask) =>
      updateLeadTask(t.id, { status: t.status === "done" ? "open" : "done" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lead-tasks"] }),
  });

  const list = Array.isArray(tasks) ? tasks : [];

  return (
    <>
      <Header
        title="Tarefas"
        subtitle="Follow-up · prazos e compromissos do time"
      />
      <div className="page-scroll page-pad space-y-4 max-w-3xl">
        {overdueNotifs.length > 0 && (
          <div className="flex flex-col gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 sm:flex-row sm:items-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">
                {overdueNotifs.length} follow-up(s) atrasado(s)
              </p>
              <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                {overdueNotifs.slice(0, 3).map((n) => (
                  <li key={n.id} className="truncate">{n.body || n.title}</li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              onClick={() => markReadMut.mutate()}
              className="rounded-lg border border-amber-500/30 px-3 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-500/10"
            >
              Marcar como vistas
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => runCheckMut.mutate()}
            disabled={runCheckMut.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium hover:bg-secondary disabled:opacity-50"
          >
            <Bell className="h-3.5 w-3.5" />
            {runCheckMut.isPending ? "Verificando..." : "Verificar atrasadas agora"}
          </button>
          {runCheckMut.isSuccess && (
            <span className="self-center text-xs text-primary">
              {(runCheckMut.data as any)?.notified ?? 0} nova(s) notificação(ões)
            </span>
          )}
        </div>

        {/* Nova tarefa */}
        <div className="rounded-xl border border-border bg-card card-pad space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" /> Nova tarefa de follow-up
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            <select
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-11 rounded-xl border border-border bg-secondary/40 px-3 text-sm"
            >
              <option value="">Selecione o lead</option>
              {phones.map((p) => (
                <option key={p.phone} value={p.phone}>
                  {p.label}
                </option>
              ))}
            </select>
            <input
              type="datetime-local"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              className="h-11 rounded-xl border border-border bg-secondary/40 px-3 text-sm"
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Ligar para confirmar proposta"
              className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-secondary/40 px-3 text-sm"
            />
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="h-11 rounded-xl border border-border bg-secondary/40 px-3 text-sm"
            >
              <option value="low">Baixa</option>
              <option value="medium">Média</option>
              <option value="high">Alta</option>
            </select>
            <button
              type="button"
              disabled={!phone || !title.trim() || createMut.isPending}
              onClick={() => createMut.mutate()}
              className="h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              Criar
            </button>
          </div>
        </div>

        {/* Filtro status */}
        <div className="flex gap-2">
          {(["open", "done", "all"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                status === s
                  ? "bg-primary/15 text-primary"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {s === "open" ? "Abertas" : s === "done" ? "Concluídas" : "Todas"}
            </button>
          ))}
        </div>

        {isLoading && (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        )}

        {!isLoading && list.length === 0 && (
          <EmptyState
            icon={ListTodo}
            title="Nenhuma tarefa"
            description="Crie follow-ups com prazo para o time não perder lead quente."
          />
        )}

        <div className="space-y-2">
          {list.map((t) => {
            const overdue =
              t.status === "open" &&
              t.due_at &&
              new Date(t.due_at).getTime() < Date.now();
            return (
              <div
                key={t.id}
                className={`flex items-start gap-3 rounded-xl border bg-card p-4 ${
                  overdue ? "border-amber-500/40" : "border-border"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleMut.mutate(t)}
                  className="mt-0.5 text-primary"
                  aria-label="Alternar status"
                >
                  {t.status === "done" ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-medium ${
                      t.status === "done" ? "line-through text-muted-foreground" : ""
                    }`}
                  >
                    {t.title}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t.phone.replace("@s.whatsapp.net", "")}
                    {" · "}
                    <span className={overdue ? "text-amber-400 font-semibold" : ""}>
                      {fmtDue(t.due_at)}
                    </span>
                    {" · "}
                    {t.priority}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
