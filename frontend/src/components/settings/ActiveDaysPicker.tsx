import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import {
  DAY_OPTIONS,
  formatActiveDays,
  parseActiveDays,
} from "@/types/reminder";

type Props = {
  value: string;
  onChange: (activeDays: string) => void;
  disabled?: boolean;
};

export default function ActiveDaysPicker({ value, onChange, disabled }: Props) {
  const selectedDays = parseActiveDays(value);

  const toggleDay = (dayIndex: number) => {
    if (disabled) return;

    const nextDays = selectedDays.includes(dayIndex)
      ? selectedDays.filter((day) => day !== dayIndex)
      : [...selectedDays, dayIndex];

    if (nextDays.length === 0) return;
    onChange(formatActiveDays(nextDays));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Jours actifs</Text>
      <View style={styles.row}>
        {DAY_OPTIONS.map((day) => {
          const isSelected = selectedDays.includes(day.index);
          return (
            <Pressable
              key={day.index}
              style={[styles.dayChip, isSelected && styles.dayChipSelected]}
              onPress={() => toggleDay(day.index)}
              disabled={disabled}
            >
              <Text
                style={[styles.dayText, isSelected && styles.dayTextSelected]}
              >
                {day.label}
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
  dayChip: {
    minWidth: 42,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  dayChipSelected: {
    backgroundColor: "#EAF1FF",
    borderColor: "#407BFF",
  },
  dayText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  dayTextSelected: {
    color: "#407BFF",
  },
});
