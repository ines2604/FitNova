import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ChatMessage } from "@/types/chatbot";

type Props = {
  message: ChatMessage;
};

export default function MessageBubble({ message }: Props) {
  const isUser = message.sender === "user";

  return (
    <View
      style={[
        styles.row,
        isUser ? styles.rowUser : styles.rowBot,
      ]}
    >
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot]}>
        <Text style={isUser ? styles.textUser : styles.textBot}>
          {message.content}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  rowUser: {
    justifyContent: "flex-end",
  },
  rowBot: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "80%",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  bubbleUser: {
    backgroundColor: "#407BFF",
    borderBottomRightRadius: 4,
  },
  bubbleBot: {
    backgroundColor: "#F1F5F9",
    borderBottomLeftRadius: 4,
  },
  textUser: {
    color: "#fff",
    fontSize: 14,
    lineHeight: 20,
  },
  textBot: {
    color: "#1E293B",
    fontSize: 14,
    lineHeight: 20,
  },
});
