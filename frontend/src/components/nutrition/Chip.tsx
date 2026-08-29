import React from "react";
import { Pressable, Text, StyleSheet } from "react-native";

type Props = {
  label: string;
  active?: boolean;
  onPress: () => void;
};

export default function Chip({ label, active, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexShrink: 0,
    height: 36,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    marginRight: 8,
    justifyContent: "center",
    alignItems: "center",
  },

  chipActive: {
    backgroundColor: "#407BFF",
  },

  label: {
    flexShrink: 0,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    color: "#475569",
  },

  labelActive: {
    color: "#fff",
  },
});