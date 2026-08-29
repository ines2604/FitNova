import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { FREQUENCY_OPTIONS, ReminderFrequency } from "@/types/reminder";

type Props = {
  value: ReminderFrequency;
  onChange: (frequency: ReminderFrequency) => void;
  disabled?: boolean;
};

export default function FrequencyPicker({ value, onChange, disabled }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Fréquence</Text>
      <View style={styles.row}>
        {FREQUENCY_OPTIONS.map((option) => {
          const isSelected = option.value === value;
          return (
            <Pressable
              key={option.value}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => !disabled && onChange(option.value)}
              disabled={disabled}
            >
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                {option.shortLabel}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  chipSelected: {
    backgroundColor: "#EAF1FF",
    borderColor: "#407BFF",
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  chipTextSelected: {
    color: "#407BFF",
  },
});
