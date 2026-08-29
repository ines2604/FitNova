import api from "./api";
import { ChatMessage, Conversation } from "../types/chatbot";

export const getConversations = async (): Promise<Conversation[]> => {
  const { data } = await api.get("/chatbot/conversations");
  return data as Conversation[];
};

export const createConversation = async (
  title?: string
): Promise<Conversation> => {
  const { data } = await api.post("/chatbot/conversations", { title });
  return data as Conversation;
};

export const deleteConversation = async (id: number): Promise<void> => {
  await api.delete(`/chatbot/conversations/${id}`);
};

export const getMessages = async (
  conversationId: number
): Promise<ChatMessage[]> => {
  const { data } = await api.get(
    `/chatbot/conversations/${conversationId}/messages`
  );
  return data as ChatMessage[];
};

// Le backend ne renvoie que le message du bot (le message utilisateur est
// déjà connu côté client, pas besoin de le renvoyer).
export const sendMessage = async (
  conversationId: number,
  content: string
): Promise<ChatMessage> => {
  const { data } = await api.post(
    `/chatbot/conversations/${conversationId}/messages`,
    { content }
  );
  return data as ChatMessage;
};
