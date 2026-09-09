import axios from "axios";

const API_URL = "http://localhost:3000";

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("jarvis_token");
    if (token) {
      config.headers.Authorization = "Bearer " + token;
    }
  }
  return config;
});

// Tipos
export type Conversation = {
  phone: string;
  channel?: string;
  external_id?: string;
  display_name?: string;
  context?: unknown;
  status?: string;
  lead_score?: number;
  current_step?: string;
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

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  created_at?: string;
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

export async function login(email: string, password: string) {
  const { data } = await api.post("/auth/login", { email, password });
  if (data.token) localStorage.setItem("jarvis_token", data.token);
  if (data.user) localStorage.setItem("jarvis_user", JSON.stringify(data.user));
  return data as { token: string; user: AuthUser };
}

export async function register(name: string, email: string, password: string) {
  const { data } = await api.post("/auth/register", { name, email, password });
  if (data.token) localStorage.setItem("jarvis_token", data.token);
  if (data.user) localStorage.setItem("jarvis_user", JSON.stringify(data.user));
  return data as { token: string; user: AuthUser };
}

export function logout() {
  localStorage.removeItem("jarvis_token");
  localStorage.removeItem("jarvis_user");
}

export async function getHealth() {
  const { data } = await api.get("/health");
  return data as { status: string; timestamp: string };
}

export async function getConversations(channel?: string) {
  const { data } = await api.get("/api/conversations", {
    params: channel && channel !== "all" ? { channel } : undefined,
  });
  return data as Conversation[];
}

export async function getConversation(phone: string) {
  const { data } = await api.get(
    "/api/conversations/" + encodeURIComponent(phone)
  );
  return data as Conversation & { messages: Message[] };
}

export async function updateStep(phone: string, step: string) {
  const { data } = await api.patch(
    "/api/conversations/" + encodeURIComponent(phone) + "/step",
    { step }
  );
  return data;
}

export async function sendMessage(phone: string, message: string) {
  const { data } = await api.post(
    "/api/conversations/" + encodeURIComponent(phone) + "/messages",
    { message }
  );
  return data;
}

export async function getChannelStatus() {
  const { data } = await api.get("/api/channels/status");
  return data as Record<
    string,
    { enabled: boolean; status: string; note?: string }
  >;
}

export async function getStats() {
  try {
    const conversations = await getConversations();
    const list = Array.isArray(conversations) ? conversations : [];
    return {
      conversations: list.length,
      leads: list.filter((c) => Number(c.messageCount || 0) > 0).length,
      messages: list.reduce((s, c) => s + Number(c.messageCount || 0), 0),
      avgScore:
        list.length > 0
          ? Math.round(
              list.reduce((s, c) => s + Number(c.lead_score || 0), 0) /
                list.length
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
      avgScore: 0,
      byChannel: {},
    };
  }
}

export async function getLeads(channel?: string) {
  const conversations = await getConversations(channel);
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
    messageCount: Number(c.messageCount || 0),
  }));
}

