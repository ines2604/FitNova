import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants/colors";
import MacroRing from "./MacroRing";

type Props = {
  consumedCalories: number;
  goalCalories: number;
  consumedProtein: number;
  consumedCarbs: number;
  consumedFat: number;
};

// Répartition standard des macros à partir de l'objectif calorique
// (protéines 30% / glucides 40% / lipides 30%), convertie en grammes.
const macroGoalsFromCalories = (calories: number) => ({
  protein: Math.round((calories * 0.3) / 4),
  carbs: Math.round((calories * 0.4) / 4),
  fat: Math.round((calories * 0.3) / 9),
});

export default function CalorieSummary({
  consumedCalories,
  goalCalories,
  consumedProtein,
  consumedCarbs,
  consumedFat,
}: Props) {
  const remaining = Math.max(Math.round(goalCalories - consumedCalories), 0);
  const percent =
    goalCalories > 0 ? Math.min(Math.round((consumedCalories / goalCalories) * 100), 100) : 0;
  const macroGoals = macroGoalsFromCalories(goalCalories || 2000);

  return (
    <View style={styles.container}>
      <Text style={styles.bigNumber}>{remaining} Cal</Text>
      <Text style={styles.bigLabel}>restantes aujourd'hui</Text>

      <View style={styles.consumedRow}>
        <View style={styles.consumedLeft}>
          <Ionicons name="flame" size={16} color="#F08A24" />
          <Text style={styles.consumedText}>
            Consommé <Text style={styles.consumedPercent}>({percent}%)</Text>
          </Text>
        </View>
        <View style={styles.consumedRight}>
          <View style={styles.consumedIcon}>
            <Ionicons name="arrow-down" size={12} color="#fff" />
          </View>
          <Text style={styles.consumedValue}>{Math.round(consumedCalories)} Cal</Text>
        </View>
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${percent}%` }]} />
      </View>

      <View style={styles.ringsRow}>
        <MacroRing
          label="Glucides"
          consumedG={consumedCarbs}
          goalG={macroGoals.carbs}
          color={COLORS.carbs}
        />
        <MacroRing
          label="Lipides"
          consumedG={consumedFat}
          goalG={macroGoals.fat}
          color={COLORS.fat}
        />
        <MacroRing
          label="Protéines"
          consumedG={consumedProtein}
          goalG={macroGoals.protein}
          color={COLORS.protein}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 20,
  },
  bigNumber: {
    fontSize: 40,
    fontWeight: "800",
    color: COLORS.textDark,
  },
  bigLabel: {
    fontSize: 14,
    color: COLORS.textFaint,
    fontWeight: "600",
    marginTop: 2,
  },
  consumedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginTop: 24,
  },
  consumedLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  consumedText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  consumedPercent: {
    color: COLORS.textFaint,
    fontWeight: "600",
  },
  consumedRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  consumedIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  consumedValue: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.primary,
  },
  track: {
    width: "100%",
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primaryLight,
    marginTop: 10,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  ringsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 26,
    paddingHorizontal: 8,
  },
});
