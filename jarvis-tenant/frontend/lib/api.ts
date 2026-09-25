import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("jarvis_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem("jarvis_refresh");
  if (!refreshToken) return null;
  try {
    const { data } = await axios.post(`${API_URL}/auth/refresh`, {
      refreshToken,
    });
    const access = data.accessToken || data.token;
    if (access) localStorage.setItem("jarvis_token", access);
    if (data.refreshToken) localStorage.setItem("jarvis_refresh", data.refreshToken);
    if (data.user) localStorage.setItem("jarvis_user", JSON.stringify(data.user));
    return access;
  } catch {
    localStorage.removeItem("jarvis_token");
    localStorage.removeItem("jarvis_refresh");
    localStorage.removeItem("jarvis_user");
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
  if (access) localStorage.setItem("jarvis_token", access);
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
  }));
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
