export type MessageSender = "user" | "bot";

export type ChatMessage = {
  id: number;
  conversation_id?: number;
  conversationId?: number;
  sender: MessageSender;
  content: string;
  created_at?: string;
};

export type Conversation = {
  id: number;
  user_id?: number;
  userId?: number;
  title: string;
  created_at?: string;
};

export const DEFAULT_CONVERSATION_TITLE = "Nouvelle conversation";

export const getConversationDate = (conversation: Conversation) =>
  conversation.created_at ? new Date(conversation.created_at) : null;

export const formatConversationDate = (conversation: Conversation) => {
  const date = getConversationDate(conversation);
  if (!date) return "";
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};
