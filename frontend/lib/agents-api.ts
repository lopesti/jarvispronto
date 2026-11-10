import { api } from "./api";

export interface AgentTool {
  tool_key: string;
  enabled: boolean;
  config?: Record<string, unknown>;
}

export interface AgentChannel {
  channel: string;
  enabled: boolean;
}

export interface Agent {
  id: number;
  company_id: number;
  produto_id: number;
  name: string;
  description?: string;
  status: "draft" | "published" | "archived" | string;
  template_key: string;
  system_prompt?: string;
  welcome_message?: string;
  temperature?: number;
  model?: string;
  version?: number;
  produto_nome?: string;
  produto_preco?: number;
  produto_estoque?: number;
  knowledge?: string;
  tools?: AgentTool[];
  channels?: AgentChannel[];
  created_at?: string;
  updated_at?: string;
}

export interface AgentTemplate {
  key: string;
  name_suffix: string;
  system_prompt: string;
  welcome_message: string;
}

export async function getAgents(params?: {
  status?: string;
  produto_id?: number;
}): Promise<Agent[]> {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.produto_id) q.set("produto_id", String(params.produto_id));
  const { data } = await api.get(`/api/agents?${q}`);
  return data;
}

export async function getAgent(id: number): Promise<Agent> {
  const { data } = await api.get(`/api/agents/${id}`);
  return data;
}

export async function getAgentByProduto(produtoId: number): Promise<Agent> {
  const { data } = await api.get(`/api/agents/produto/${produtoId}`);
  return data;
}

export async function createAgent(payload: {
  produto_id: number;
  name?: string;
  description?: string;
  template_key?: string;
  system_prompt?: string;
  welcome_message?: string;
  temperature?: number;
  model?: string;
  tools?: AgentTool[];
  channels?: string[];
}) {
  const { data } = await api.post("/api/agents", payload);
  return data;
}

export async function updateAgent(
  id: number,
  payload: Partial<Agent> & { refresh_knowledge?: boolean; tools?: AgentTool[]; channels?: any[] }
) {
  const { data } = await api.put(`/api/agents/${id}`, payload);
  return data;
}

export async function publishAgent(id: number) {
  const { data } = await api.post(`/api/agents/${id}/publish`);
  return data;
}

export async function archiveAgent(id: number) {
  const { data } = await api.post(`/api/agents/${id}/archive`);
  return data;
}

export async function deleteAgent(id: number) {
  const { data } = await api.delete(`/api/agents/${id}`);
  return data;
}

export async function previewAgent(id: number, message: string) {
  const { data } = await api.post(`/api/agents/${id}/preview`, { message });
  return data;
}

export async function getAgentTemplates(): Promise<AgentTemplate[]> {
  const { data } = await api.get("/api/agents/templates");
  return data;
}

export async function getAgentsGlobal(): Promise<Agent[]> {
  const { data } = await api.get("/api/agents/global");
  return data;
}
