import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true, // S-04: envia cookies httpOnly
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    // Preferência: cookie httpOnly (automático via withCredentials).
    // Fallback Bearer em sessionStorage (não persiste entre abas fechadas como localStorage).
    const token =
      sessionStorage.getItem("jarvis_token") ||
      localStorage.getItem("jarvis_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  // S-04: tenta cookie httpOnly primeiro (body vazio); fallback session/local
  const refreshToken =
    (typeof window !== "undefined" &&
      (sessionStorage.getItem("jarvis_refresh") ||
        localStorage.getItem("jarvis_refresh"))) ||
    undefined;
  try {
    const { data } = await axios.post(
      `${API_URL}/auth/refresh`,
      refreshToken ? { refreshToken } : {},
      { withCredentials: true }
    );
    const access = data.accessToken || data.token;
    if (access && typeof window !== "undefined") {
      sessionStorage.setItem("jarvis_token", access);
      localStorage.removeItem("jarvis_token"); // migra para fora do localStorage
    }
    if (data.refreshToken && typeof window !== "undefined") {
      sessionStorage.setItem("jarvis_refresh", data.refreshToken);
      localStorage.removeItem("jarvis_refresh");
    }
    if (data.user && typeof window !== "undefined") {
      sessionStorage.setItem("jarvis_user", JSON.stringify(data.user));
      localStorage.setItem("jarvis_user", JSON.stringify(data.user)); // UI legada
    }
    return access;
  } catch {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("jarvis_token");
      sessionStorage.removeItem("jarvis_refresh");
      localStorage.removeItem("jarvis_token");
      localStorage.removeItem("jarvis_refresh");
      localStorage.removeItem("jarvis_user");
    }
    return null;
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (
      error.response?.status === 401 &&
      error.response?.data?.code === "TOKEN_EXPIRED" &&
      !original._retry
    ) {
      original._retry = true;
      if (!refreshing) refreshing = refreshAccessToken().finally(() => { refreshing = null; });
      const newToken = await refreshing;
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
      if (typeof window !== "undefined") window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role?: string;
  created_at?: string;
  companyId?: number;
  is_superadmin?: boolean;
};

export type Conversation = {
  phone: string;
  channel?: string;
  external_id?: string;
  display_name?: string;
  context?: unknown;
  status?: string;
  lead_score?: number;
  current_step?: string;
  needs_human?: boolean;
  assigned_to?: number | null;
  handoff_summary?: string | null;
  bot_mode?: "full" | "hybrid" | "human" | string;
  deal_value?: number | string | null;
  lead_source?: string | null;
  tags?: string[] | string | null;
  notes?: string | null;
  probability?: number | null;
  createdAt?: string;
  updatedAt?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  messageCount?: number | string;
};

export type Message = {
  id?: number;
  phone: string;
  role: string;
  content: string;
  direction?: string;
  channel?: string;
  created_at?: string;
};

export type ChannelStatus = {
  enabled: boolean;
  status: string;
  note?: string;
  label?: string;
  connected?: boolean;
  qrPending?: boolean;
};

export const FUNNEL_STEPS = [
  { id: "inicio", label: "Novo" },
  { id: "qualificacao", label: "Qualificacao" },
  { id: "interesse", label: "Interesse" },
  { id: "objecao", label: "Objecao" },
  { id: "fechamento", label: "Fechamento" },
  { id: "vendido", label: "Ganho" },
  { id: "perdido", label: "Perdido" },
] as const;

export function stepLabel(step?: string) {
  const found = FUNNEL_STEPS.find((s) => s.id === step);
  return found?.label || step || "Novo";
}

function storeAuth(data: {
  token?: string;
  accessToken?: string;
  refreshToken?: string;
  user?: AuthUser;
}) {
  const access = data.accessToken || data.token;
  if (access && typeof window !== "undefined") {
    sessionStorage.setItem("jarvis_token", access);
    localStorage.removeItem("jarvis_token");
  }
  if (data.refreshToken) localStorage.setItem("jarvis_refresh", data.refreshToken);
  if (data.user) localStorage.setItem("jarvis_user", JSON.stringify(data.user));
}

export async function login(email: string, password: string) {
  const { data } = await api.post("/auth/login", { email, password });
  storeAuth(data);
  return data as {
    token: string;
    accessToken: string;
    refreshToken: string;
    user: AuthUser;
  };
}

export async function register(name: string, email: string, password: string) {
  const { data } = await api.post("/auth/register", { name, email, password });
  storeAuth(data);
  return data as {
    token: string;
    accessToken: string;
    refreshToken: string;
    user: AuthUser;
  };
}

export async function logout() {
  const refreshToken = localStorage.getItem("jarvis_refresh");
  try {
    await api.post("/auth/logout", { refreshToken });
  } catch {
    /* ignore */
  }
  sessionStorage.removeItem("jarvis_token");
  sessionStorage.removeItem("jarvis_refresh");
  sessionStorage.removeItem("jarvis_user");
  localStorage.removeItem("jarvis_token");
  localStorage.removeItem("jarvis_refresh");
  localStorage.removeItem("jarvis_user");
}

export async function getMe() {
  const { data } = await api.get("/auth/me");
  return data.user as AuthUser;
}

export async function getHealth() {
  const { data } = await api.get("/health");
  return data as { status: string; timestamp: string };
}

export async function getConversations(opts?: {
  channel?: string;
  filter?: "all" | "needs_human" | "mine";
}) {
  const { data } = await api.get("/api/conversations", {
    params: {
      ...(opts?.channel && opts.channel !== "all" ? { channel: opts.channel } : {}),
      ...(opts?.filter && opts.filter !== "all" ? { filter: opts.filter } : {}),
    },
  });
  return data as Conversation[];
}

export async function getConversation(phone: string) {
  const { data } = await api.get(
    `/api/conversations/${encodeURIComponent(phone)}`
  );
  return data as Conversation & { messages: Message[] };
}

export async function updateStep(phone: string, step: string) {
  const { data } = await api.patch(
    `/api/conversations/${encodeURIComponent(phone)}/step`,
    { step }
  );
  return data;
}

export async function sendMessage(phone: string, message: string) {
  const { data } = await api.post(
    `/api/conversations/${encodeURIComponent(phone)}/messages`,
    { message }
  );
  return data;
}

export async function handoffConversation(
  phone: string,
  body?: { summary?: string; assignToMe?: boolean }
) {
  const { data } = await api.post(
    `/api/conversations/${encodeURIComponent(phone)}/handoff`,
    body || {}
  );
  return data as Conversation;
}

export async function claimConversation(phone: string) {
  const { data } = await api.post(
    `/api/conversations/${encodeURIComponent(phone)}/claim`
  );
  return data as Conversation;
}

export async function releaseToBot(phone: string, bot_mode?: string) {
  const { data } = await api.post(
    `/api/conversations/${encodeURIComponent(phone)}/release`,
    { bot_mode }
  );
  return data as Conversation;
}

export async function setBotMode(phone: string, bot_mode: "full" | "hybrid" | "human") {
  const { data } = await api.patch(
    `/api/conversations/${encodeURIComponent(phone)}/bot-mode`,
    { bot_mode }
  );
  return data as Conversation;
}

export async function getChannelStatus() {
  const { data } = await api.get("/api/channels/status");
  return data as Record<string, ChannelStatus>;
}

export async function getStats() {
  try {
    const conversations = await getConversations();
    const list = Array.isArray(conversations) ? conversations : [];
    return {
      conversations: list.length,
      leads: list.filter((c) => Number(c.messageCount || 0) > 0).length,
      messages: list.reduce((s, c) => s + Number(c.messageCount || 0), 0),
      needsHuman: list.filter((c) => c.needs_human).length,
      avgScore:
        list.length > 0
          ? Math.round(
              list.reduce((s, c) => s + Number(c.lead_score || 0), 0) / list.length
            )
          : 0,
      byChannel: list.reduce((acc, c) => {
        const ch = c.channel || "whatsapp";
        acc[ch] = (acc[ch] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  } catch {
    return {
      conversations: 0,
      leads: 0,
      messages: 0,
      needsHuman: 0,
      avgScore: 0,
      byChannel: {},
    };
  }
}

export async function getLeads(channel?: string) {
  const conversations = await getConversations(
    channel ? { channel } : undefined
  );
  const list = Array.isArray(conversations) ? conversations : [];
  return list.map((c) => ({
    phone: c.phone,
    name:
      c.display_name ||
      c.phone.replace("@s.whatsapp.net", "").replace(/^(instagram|facebook):/, ""),
    channel: c.channel || "whatsapp",
    score: Number(c.lead_score || 0),
    stage: c.current_step || "inicio",
    lastMessage: c.lastMessage || "",
    status: c.status || "active",
    needs_human: !!c.needs_human,
    messageCount: Number(c.messageCount || 0),
    deal_value: Number(c.deal_value || 0),
    lead_source: c.lead_source || "",
    tags: Array.isArray(c.tags) ? c.tags : (typeof c.tags === "string" ? safeJsonArr(c.tags) : []),
    notes: c.notes || "",
    probability: Number(c.probability || 0),
    updatedAt: c.updatedAt,
  }));
}

function safeJsonArr(v: string): string[] {
  try {
    const parsed = JSON.parse(v);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export type Produto = {
  id: number;
  nome: string;
  descricao?: string | null;
  preco: number | string;
  estoque?: number;
  created_at?: string;
  updated_at?: string;
};

export async function getProdutos() {
  const { data } = await api.get("/api/produtos");
  return data as Produto[];
}

export async function createProduto(payload: {
  nome: string;
  descricao?: string;
  preco: number;
  estoque?: number;
}) {
  const { data } = await api.post("/api/produtos", payload);
  return data;
}

export async function updateProduto(
  id: number | string,
  payload: { nome?: string; descricao?: string; preco?: number; estoque?: number }
) {
  const { data } = await api.put(`/api/produtos/${id}`, payload);
  return data;
}

export async function deleteProduto(id: number | string) {
  const { data } = await api.delete(`/api/produtos/${id}`);
  return data;
}

// ═══════════════════════════════════════════════════════════
//  WhatsApp multi-tenant (por empresa)
// ═══════════════════════════════════════════════════════════

export type WhatsAppStatus = {
  companyId: number;
  state: string;
  connected: boolean;
  hasQr: boolean;
};

export async function getWhatsAppStatus() {
  const { data } = await api.get("/api/whatsapp/status");
  return data as WhatsAppStatus;
}

export async function connectWhatsApp() {
  const { data } = await api.post("/api/whatsapp/connect");
  return data as WhatsAppStatus & { message?: string };
}

export async function disconnectWhatsApp(clearAuth = false) {
  const { data } = await api.post("/api/whatsapp/disconnect", { clearAuth });
  return data as { message: string; clearAuth: boolean };
}

export async function getWhatsAppQr() {
  const { data } = await api.get("/api/whatsapp/qr");
  return data as { qrImage?: string; hint?: string } & WhatsAppStatus;
}

// ═══════════════════════════════════════════════════════════
//  Helpers de sessão (superadmin, user atual)
// ═══════════════════════════════════════════════════════════

export function getCurrentUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("jarvis_user");
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function isSuperadmin(): boolean {
  const user = getCurrentUser();
  return user?.is_superadmin === true;
}
// ─── SaaS / Billing ───────────────────────────────────────
export type PlanLimits = {
  conversations?: number;
  users?: number;
  whatsapp_numbers?: number;
  produtos?: number;
  history_days?: number;
};

export type UsageSnapshot = {
  subscription: {
    status: string;
    planCode: string;
    planName: string;
    billingCycle: string;
    trialEndsAt?: string;
    currentPeriodEnd?: string;
    cancelAtPeriodEnd?: boolean;
    priceMonthly?: number;
    features?: Record<string, unknown>;
  } | null;
  usage: {
    conversations?: number;
    messages_sent?: number;
    users_count?: number;
    whatsapp_numbers?: number;
    produtos_count?: number;
    year_month?: string;
  };
  limits: PlanLimits;
  checks: Record<
    string,
    {
      allowed: boolean;
      used: number;
      limit: number;
      remaining: number;
      planCode?: string;
      reason?: string | null;
    }
  >;
};

export async function getPlans() {
  const { data } = await api.get("/api/plans");
  return data.plans as Array<{
    id: number;
    code: string;
    name: string;
    price_monthly: number;
    price_yearly: number;
    limits: PlanLimits;
    features: Record<string, unknown>;
  }>;
}

export async function getBillingSubscription() {
  const { data } = await api.get("/api/billing/subscription");
  return data as UsageSnapshot;
}

export async function getBillingUsage() {
  const { data } = await api.get("/api/billing/usage");
  return data;
}

export async function subscribePlan(planCode: string, billingCycle: "monthly" | "yearly" = "monthly") {
  const { data } = await api.post("/api/billing/subscribe", { planCode, billingCycle });
  return data;
}

export async function cancelSubscription() {
  const { data } = await api.post("/api/billing/cancel");
  return data;
}

// ─── CRM ──────────────────────────────────────────────────
export async function updateLeadCrm(
  phone: string,
  payload: {
    deal_value?: number;
    lead_source?: string;
    tags?: string[];
    notes?: string;
    probability?: number;
    current_step?: string;
  }
) {
  const { data } = await api.patch(`/api/crm/leads/${encodeURIComponent(phone)}`, payload);
  return data;
}

export async function getLeadNotes(phone: string) {
  const { data } = await api.get(`/api/crm/leads/${encodeURIComponent(phone)}/notes`);
  return data as Array<{ id: number; body: string; user_name?: string; created_at: string }>;
}

export async function addLeadNote(phone: string, body: string) {
  const { data } = await api.post(`/api/crm/leads/${encodeURIComponent(phone)}/notes`, { body });
  return data;
}

export async function getAutomations() {
  const { data } = await api.get("/api/crm/automations");
  return data as Array<{
    id: number;
    name: string;
    enabled: boolean;
    trigger_type: string;
    action_type: string;
  }>;
}

export async function createAutomation(payload: {
  name: string;
  trigger_type: string;
  action_type: string;
  trigger_config?: Record<string, unknown>;
  action_config?: Record<string, unknown>;
  enabled?: boolean;
}) {
  const { data } = await api.post("/api/crm/automations", payload);
  return data;
}

export async function getFunnelAnalytics() {
  const { data } = await api.get("/api/crm/analytics/funnel");
  return data as {
    total: number;
    steps: Array<{ step: string; total: number; avg_score: number; pipeline_value: number }>;
  };
}


// ─── Tasks / follow-up ────────────────────────────────────
export type LeadTask = {
  id: number;
  phone: string;
  title: string;
  description?: string | null;
  due_at?: string | null;
  status: string;
  priority: string;
  assigned_to?: number | null;
  assignee_name?: string | null;
  created_at?: string;
  completed_at?: string | null;
};

export async function getLeadTasks(opts?: { status?: string; phone?: string }) {
  const { data } = await api.get("/api/crm/tasks", {
    params: {
      ...(opts?.status ? { status: opts.status } : {}),
      ...(opts?.phone ? { phone: opts.phone } : {}),
    },
  });
  return data as LeadTask[];
}

export async function createLeadTask(payload: {
  phone: string;
  title: string;
  description?: string;
  due_at?: string | null;
  priority?: string;
  assigned_to?: number | null;
}) {
  const { data } = await api.post("/api/crm/tasks", payload);
  return data as LeadTask;
}

export async function updateLeadTask(
  id: number,
  payload: Partial<{
    title: string;
    description: string;
    due_at: string | null;
    priority: string;
    status: string;
    assigned_to: number | null;
  }>
) {
  const { data } = await api.patch(`/api/crm/tasks/${id}`, payload);
  return data as LeadTask;
}

export async function deleteLeadTask(id: number) {
  const { data } = await api.delete(`/api/crm/tasks/${id}`);
  return data;
}


// ─── Notifications ────────────────────────────────────────
export type AppNotification = {
  id: number;
  type: string;
  title: string;
  body?: string | null;
  payload?: Record<string, unknown>;
  read_at?: string | null;
  created_at?: string;
};

export async function getNotifications(unreadOnly = false) {
  const { data } = await api.get("/api/crm/notifications", {
    params: unreadOnly ? { unread: "1" } : {},
  });
  return data as AppNotification[];
}

export async function markNotificationsRead(ids?: number[]) {
  const { data } = await api.post("/api/crm/notifications/read", {
    ids: ids || [],
  });
  return data;
}

export async function checkOverdueTasksNow() {
  const { data } = await api.post("/api/crm/tasks/check-overdue");
  return data as { notified: number };
}

// ─── Company config / onboarding ──────────────────────────
export async function getCompanyConfig(companyId: number) {
  const { data } = await api.get(`/api/companies/${companyId}/config`);
  return data as { id: number; name: string; config: Record<string, unknown> };
}

export async function updateCompanyConfig(
  companyId: number,
  patch: Record<string, unknown>
) {
  const { data } = await api.put(`/api/companies/${companyId}/config`, patch);
  // API pode retornar company direto ou { ok, company }
  const company = (data as any)?.company || data;
  return company as { id: number; name: string; config: Record<string, unknown> };
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("jarvis_user");
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

// ─── Web Push ─────────────────────────────────────────────
export async function getVapidPublicKey() {
  const { data } = await api.get("/api/crm/push/vapid-public-key");
  return data as { publicKey: string };
}

export async function subscribePush(subscription: PushSubscriptionJSON) {
  const { data } = await api.post("/api/crm/push/subscribe", { subscription });
  return data;
}

export async function unsubscribePush(endpoint: string) {
  const { data } = await api.post("/api/crm/push/unsubscribe", { endpoint });
  return data;
}

export async function testPush(message?: string) {
  const { data } = await api.post("/api/crm/push/test", { message });
  return data as { sent: number; failed: number };
}
