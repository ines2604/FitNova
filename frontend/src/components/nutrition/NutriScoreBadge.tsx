import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { NutriScore } from "@/types/nutrition";

const COLORS: Record<string, string> = {
  a: "#1E8F4E",
  b: "#7AC943",
  c: "#F5C518",
  d: "#F08A24",
  e: "#E5493A",
};

export default function NutriScoreBadge({ score }: { score: NutriScore }) {
  if (!score) return null;
  const color = COLORS[score] || "#94A3B8";

  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Text style={styles.label}>{score.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },
});
