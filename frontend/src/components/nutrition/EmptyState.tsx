import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
};

export default function EmptyState({ icon = "search-outline", title, subtitle }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={28} color="#94A3B8" />
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#475569",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 4,
  },
});
