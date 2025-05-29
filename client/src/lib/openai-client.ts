import { apiRequest } from "./queryClient";
import type { ChatRequest, ChatResponse } from "@shared/schema";

export async function sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
  const response = await apiRequest("POST", "/api/chat", request);
  return response.json();
}

export async function getConversationHistory(sessionId: string) {
  const response = await apiRequest("GET", `/api/conversation/${sessionId}`);
  return response.json();
}
