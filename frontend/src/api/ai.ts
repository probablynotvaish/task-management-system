import { api } from "./client";

export type ChatMessage = {
  role: "user" | "model";
  content: string;
};

export type ActionTaken = {
  type: "create" | "update" | "archive" | string;
  summary: string;
};

export type ChatResponse = {
  reply: string;
  actions_taken: ActionTaken[];
  requests_left: number;
};

export type AIQuotaResponse = {
  requests_left: number;
  total_requests: number;
};

export async function sendChatMessage(
  message: string,
  history: ChatMessage[]
): Promise<ChatResponse> {
  const { data } = await api.post<ChatResponse>("/api/ai/chat", {
    message,
    history,
  });
  return data;
}

export async function getAIQuota(): Promise<AIQuotaResponse> {
  const { data } = await api.get<AIQuotaResponse>("/api/ai/quota");
  return data;
}
