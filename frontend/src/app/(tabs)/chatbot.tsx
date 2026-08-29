import React, { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import MessageBubble from "@/components/chatbot/MessageBubble";
import TypingIndicator from "@/components/chatbot/TypingIndicator";
import ConversationHistoryModal from "@/components/chatbot/ConversationHistoryModal";
import {
  createConversation,
  deleteConversation,
  getConversations,
  getMessages,
  sendMessage,
} from "@/services/chatbot.service";
import { ChatMessage, Conversation } from "@/types/chatbot";

const buildTitleFromMessage = (content: string) => {
  const trimmed = content.trim();
  if (trimmed.length <= 40) return trimmed;
  return `${trimmed.slice(0, 40)}…`;
};

export default function ChatbotScreen() {
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(
    null
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);

  const scrollToEnd = () => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  };

  const loadConversations = useCallback(async () => {
    setLoadingConversations(true);
    try {
      const data = await getConversations();
      setConversations(data);
      return data;
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Impossible de charger l'historique");
      return [];
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  const openConversation = useCallback(async (conversation: Conversation) => {
    setActiveConversation(conversation);
    setMessages([]);
    setLoadingMessages(true);
    try {
      const data = await getMessages(conversation.id);
      setMessages(data);
      scrollToEnd();
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Impossible de charger la conversation");
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  // A chaque ouverture de l'onglet : charge juste l'historique (pour le
  // modal). On ne rouvre jamais automatiquement une conversation existante :
  // l'écran doit démarrer "vierge" et la conversation n'est créée côté
  // serveur qu'au moment où l'utilisateur envoie son premier message
  // (voir handleSend).
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      (async () => {
        await loadConversations();
        if (cancelled) return;
      })();

      return () => {
        cancelled = true;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadConversations])
  );

  const handleCreateConversation = async (
    title?: string
  ): Promise<Conversation | null> => {
    try {
      const created = await createConversation(title);
      setConversations((current) => [created, ...current]);
      setActiveConversation(created);
      setMessages([]);
      setHistoryVisible(false);
      return created;
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Impossible de créer la conversation");
      return null;
    }
  };

  // Démarre une conversation "vierge" côté écran, sans rien créer côté
  // serveur : la création réelle n'a lieu que dans handleSend, au premier
  // message envoyé.
  const startNewConversation = () => {
    setActiveConversation(null);
    setMessages([]);
    setHistoryVisible(false);
  };

  const handleSelectFromHistory = (conversation: Conversation) => {
    setHistoryVisible(false);
    if (conversation.id === activeConversation?.id) return;
    openConversation(conversation);
  };

  const confirmDelete = (conversation: Conversation) => {
    Alert.alert(
      "Supprimer la conversation",
      "Cette conversation et ses messages seront définitivement supprimés.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: () => handleDelete(conversation),
        },
      ]
    );
  };

  const handleDelete = async (conversation: Conversation) => {
    try {
      await deleteConversation(conversation.id);
      const remaining = conversations.filter((c) => c.id !== conversation.id);
      setConversations(remaining);

      if (activeConversation?.id === conversation.id) {
        if (remaining.length > 0) {
          openConversation(remaining[0]);
        } else {
          setActiveConversation(null);
          setMessages([]);
        }
      }
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Impossible de supprimer la conversation");
    }
  };

  const handleSend = async () => {
    const content = input.trim();
    if (!content || sending) return;

    setInput("");
    setSending(true);

    try {
      let conversation = activeConversation;
      if (!conversation) {
        conversation = await handleCreateConversation(buildTitleFromMessage(content));
        if (!conversation) {
          setSending(false);
          return;
        }
      }

      const optimisticUserMessage: ChatMessage = {
        id: Date.now(),
        sender: "user",
        content,
      };
      setMessages((current) => [...current, optimisticUserMessage]);
      scrollToEnd();

      const botMessage = await sendMessage(conversation.id, content);
      setMessages((current) => [...current, botMessage]);
      scrollToEnd();
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Le chatbot n'a pas pu répondre");
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.header}>
        <Pressable style={styles.iconBtn} onPress={() => setHistoryVisible(true)}>
          <Ionicons name="time-outline" size={22} color="#1E293B" />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {activeConversation?.title || "Chatbot FitNova"}
          </Text>
          <Text style={styles.headerSubtitle}>Assistant santé &amp; fitness</Text>
        </View>

        <Pressable style={styles.iconBtn} onPress={startNewConversation}>
          <Ionicons name="add-circle-outline" size={24} color="#407BFF" />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {loadingMessages ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#407BFF" />
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="chatbubble-ellipses-outline" size={44} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>
              {loadingConversations ? "Chargement…" : "Pose-moi une question"}
            </Text>
            <Text style={styles.emptySubtitle}>
              Nutrition, activité physique, sommeil, hydratation... je suis là pour
              t'aider.
            </Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => <MessageBubble message={item} />}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={scrollToEnd}
            ListFooterComponent={sending ? <TypingIndicator /> : null}
          />
        )}

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Écris ton message…"
            placeholderTextColor="#94A3B8"
            value={input}
            onChangeText={setInput}
            multiline
            editable={!sending}
          />
          <Pressable
            style={[
              styles.sendBtn,
              (!input.trim() || sending) && styles.sendBtnDisabled,
            ]}
            onPress={handleSend}
            disabled={!input.trim() || sending}
          >
            <Ionicons name="send" size={18} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <ConversationHistoryModal
        visible={historyVisible}
        conversations={conversations}
        loading={loadingConversations}
        activeConversationId={activeConversation?.id ?? null}
        onClose={() => setHistoryVisible(false)}
        onSelect={handleSelectFromHistory}
        onDelete={confirmDelete}
        onCreate={startNewConversation}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#fff",
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1E293B",
  },
  headerSubtitle: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 1,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "700",
    color: "#334155",
  },
  emptySubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 19,
  },
  messagesList: {
    paddingVertical: 16,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  input: {
    flex: 1,
    maxHeight: 100,
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1E293B",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#407BFF",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    backgroundColor: "#CBD5E1",
  },
});