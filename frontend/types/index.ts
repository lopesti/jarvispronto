export interface Conversation {
  id: string;
  phone: string;
  name?: string;
  current_step: string;
  status: "active" | "waiting" | "closed" | "sold" | "abandoned";
  lead_score: number;
  product_name?: string;
  last_message_at?: string;
  created_at: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

export interface Lead {
  id: string;
  name?: string;
  phone: string;
  lead_score: number;
  current_step: string;
  product_name?: string;
  status: string;
  last_message_at?: string;
}

export interface Stats {
  totalConversations: number;
  leadsToday: number;
  salesToday: number;
  conversionRate: number;
  revenue: number;
}

export interface PipelineStage {
  stage: string;
  count: number;
  leads: Lead[];
}
