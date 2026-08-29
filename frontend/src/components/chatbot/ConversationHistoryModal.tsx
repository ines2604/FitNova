import React from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  Conversation,
  DEFAULT_CONVERSATION_TITLE,
  formatConversationDate,
} from "@/types/chatbot";

type Props = {
  visible: boolean;
  conversations: Conversation[];
  loading: boolean;
  activeConversationId: number | null;
  onClose: () => void;
  onSelect: (conversation: Conversation) => void;
  onDelete: (conversation: Conversation) => void;
  onCreate: () => void;
};

export default function ConversationHistoryModal({
  visible,
  conversations,
  loading,
  activeConversationId,
  onClose,
  onSelect,
  onDelete,
  onCreate,
}: Props) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Historique</Text>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color="#1E293B" />
          </Pressable>
        </View>

        <Pressable style={styles.newBtn} onPress={onCreate}>
          <Ionicons name="add-circle" size={20} color="#407BFF" />
          <Text style={styles.newBtnText}>Nouvelle conversation</Text>
        </Pressable>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#407BFF" />
          </View>
        ) : conversations.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="chatbubble-ellipses-outline" size={40} color="#CBD5E1" />
            <Text style={styles.emptyText}>Aucune conversation pour l'instant</Text>
          </View>
        ) : (
          <FlatList
            data={conversations}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const isActive = item.id === activeConversationId;
              return (
                <Pressable
                  style={[styles.item, isActive && styles.itemActive]}
                  onPress={() => onSelect(item)}
                >
                  <View style={styles.itemIcon}>
                    <Ionicons
                      name="chatbubble-ellipses"
                      size={18}
                      color={isActive ? "#407BFF" : "#94A3B8"}
                    />
                  </View>
                  <View style={styles.itemBody}>
                    <Text
                      style={[styles.itemTitle, isActive && styles.itemTitleActive]}
                      numberOfLines={1}
                    >
                      {item.title || DEFAULT_CONVERSATION_TITLE}
                    </Text>
                    <Text style={styles.itemDate}>
                      {formatConversationDate(item)}
                    </Text>
                  </View>
                  <Pressable
                    hitSlop={10}
                    style={styles.deleteBtn}
                    onPress={() => onDelete(item)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </Pressable>
                </Pressable>
              );
            }}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1E293B",
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  newBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 20,
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#EAF1FF",
  },
  newBtnText: {
    color: "#407BFF",
    fontWeight: "700",
    fontSize: 14,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 60,
  },
  emptyText: {
    marginTop: 10,
    color: "#94A3B8",
    fontSize: 14,
  },
  list: {
    padding: 20,
    paddingTop: 12,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  itemActive: {
    backgroundColor: "#EAF1FF",
    borderColor: "#407BFF",
  },
  itemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  itemBody: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
  },
  itemTitleActive: {
    color: "#407BFF",
  },
  itemDate: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 2,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
});
