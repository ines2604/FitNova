import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { COLORS } from "@/constants/colors";

type Props = {
  label: string;
  consumedG: number;
  goalG: number;
  color: string;
};

const SIZE = 56;
const STROKE = 5;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function MacroRing({ label, consumedG, goalG, color }: Props) {
  const safeConsumed = Number.isFinite(consumedG) ? consumedG : 0;
  const safeGoal = Number.isFinite(goalG) ? goalG : 0;
  const progress = safeGoal > 0 ? Math.min(safeConsumed / safeGoal, 1) : 0;
  const remaining = Math.max(Math.round(safeGoal - safeConsumed), 0);
  const consumed = Math.round(safeConsumed);
  const offset = CIRCUMFERENCE * (1 - progress);

  return (
    <View style={styles.container}>
      <View style={{ width: SIZE, height: SIZE }}>
        <Svg width={SIZE} height={SIZE}>
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke={COLORS.border}
            strokeWidth={STROKE}
            fill="none"
          />
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke={color}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            strokeDashoffset={offset}
            fill="none"
            rotation={-90}
            origin={`${SIZE / 2}, ${SIZE / 2}`}
          />
        </Svg>
        <View style={styles.centerLabel}>
          <Text style={styles.centerValue}>{remaining}g</Text>
        </View>
      </View>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.sub}>restant</Text>
      <Text style={[styles.consumedText, { color }]}>
        {consumed}g <Text style={styles.consumedSub}>consommé</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  centerLabel: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  centerValue: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.textDark,
  },
  label: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  sub: {
    fontSize: 11,
    color: COLORS.textFaint,
    fontWeight: "500",
  },
  consumedText: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: "800",
  },
  consumedSub: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.textFaint,
  },
});