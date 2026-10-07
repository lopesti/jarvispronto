import { api } from "./api";

export type SupportTicket = {
  id: number;
  company_id: number;
  user_id: number;
  subject: string;
  status: "open" | "waiting" | "resolved" | "closed";
  priority: "low" | "normal" | "high" | "urgent";
  category: string;
  assigned_to: number | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  company_name?: string;
  unread_count?: string | number;
  last_message?: string;
};

export type SupportMessage = {
  id: number;
  ticket_id: number;
  user_id: number | null;
  is_from_admin: boolean;
  body: string;
  attachment_url: string | null;
  read_at: string | null;
  created_at: string;
  author_name?: string;
  author_email?: string;
};

// ─── Empresa ───
export async function getTickets(): Promise<SupportTicket[]> {
  const { data } = await api.get<SupportTicket[]>("/api/support/tickets");
  return data;
}

export async function getTicket(id: number | string): Promise<{
  ticket: SupportTicket;
  messages: SupportMessage[];
}> {
  const { data } = await api.get(`/api/support/tickets/${id}`);
  return data;
}

export async function createTicket(input: {
  subject: string;
  body: string;
  category?: string;
  priority?: string;
}): Promise<SupportTicket> {
  const { data } = await api.post<SupportTicket>("/api/support/tickets", input);
  return data;
}

export async function replyToTicket(id: number | string, body: string) {
  const { data } = await api.post(`/api/support/tickets/${id}/messages`, { body });
  return data;
}

export async function closeTicket(id: number | string) {
  const { data } = await api.post(`/api/support/tickets/${id}/close`);
  return data;
}

// ─── Admin ───
export async function adminGetTickets(params?: {
  status?: string;
  companyId?: number;
  assigned?: string;
}): Promise<SupportTicket[]> {
  const { data } = await api.get<SupportTicket[]>("/api/admin/support/tickets", { params });
  return data;
}

export async function adminGetTicket(id: number | string): Promise<{
  ticket: SupportTicket;
  messages: SupportMessage[];
}> {
  const { data } = await api.get(`/api/admin/support/tickets/${id}`);
  return data;
}

export async function adminReply(id: number | string, body: string) {
  const { data } = await api.post(`/api/admin/support/tickets/${id}/messages`, { body });
  return data;
}

export async function adminAssign(id: number | string) {
  const { data } = await api.put(`/api/admin/support/tickets/${id}/assign`, {});
  return data;
}

export async function adminSetStatus(id: number | string, status: string) {
  const { data } = await api.put(`/api/admin/support/tickets/${id}/status`, { status });
  return data;
}

// ─── Helpers ───
export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    open: "Aberto",
    waiting: "Aguardando",
    resolved: "Resolvido",
    closed: "Fechado",
  };
  return map[status] || status;
}

export function priorityLabel(p: string): string {
  const map: Record<string, string> = {
    low: "Baixa",
    normal: "Normal",
    high: "Alta",
    urgent: "Urgente",
  };
  return map[p] || p;
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    open: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    waiting: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    resolved: "bg-green-500/10 text-green-500 border-green-500/20",
    closed: "bg-muted text-muted-foreground border-border",
  };
  return map[status] || "bg-muted text-muted-foreground border-border";
}