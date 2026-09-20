import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { COLORS } from "@/constants/colors";
import { ChartPeriod, PERIOD_LABELS } from "@/utils/chartPeriod";

type Props = {
  value: ChartPeriod;
  onChange: (period: ChartPeriod) => void;
};

const PERIODS: ChartPeriod[] = ["week", "month", "year"];

export default function PeriodFilterTabs({ value, onChange }: Props) {
  return (
    <View style={styles.container}>
      {PERIODS.map((period) => {
        const active = period === value;
        return (
          <Pressable
            key={period}
            style={[styles.tab, active && styles.tabActive]}
            onPress={() => onChange(period)}
          >
            <Text style={[styles.tabText, active && styles.tabTextActive]}>
              {PERIOD_LABELS[period]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 3,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: "#fff",
  },
});
