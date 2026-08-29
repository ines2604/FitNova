import React, { useRef } from "react";
import {
  GestureResponderEvent,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";

const MIN_STEPS = 3000;
const MAX_STEPS = 20000;
const STEP = 500;
const SIZE = 180;
const STROKE = 12;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type Props = {
  value: number;
  onChange: (value: number) => void;
};

const StepGoalPicker = ({ value, onChange }: Props) => {
  const clamped = Math.min(Math.max(value, MIN_STEPS), MAX_STEPS);
  const progress = (clamped - MIN_STEPS) / (MAX_STEPS - MIN_STEPS);
  const offset = CIRCUMFERENCE * (1 - progress);

  const adjust = (delta: number) => {
    onChange(Math.min(Math.max(clamped + delta, MIN_STEPS), MAX_STEPS));
  };

  const updateFromTouch = (evt: GestureResponderEvent) => {
    const { locationX, locationY } = evt.nativeEvent;
    const dx = locationX - SIZE / 2;
    const dy = locationY - SIZE / 2;

    // Angle à partir du haut du cercle (0°), sens horaire
    let angle = Math.atan2(dx, -dy) * (180 / Math.PI);
    if (angle < 0) angle += 360;

    const ratio = angle / 360;
    const raw = MIN_STEPS + ratio * (MAX_STEPS - MIN_STEPS);
    const stepped = Math.round(raw / STEP) * STEP;
    const next = Math.min(Math.max(stepped, MIN_STEPS), MAX_STEPS);
    onChange(next);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: updateFromTouch,
      onPanResponderMove: updateFromTouch,
    })
  ).current;

  return (
    <View style={styles.container}>
      <View style={styles.ringWrap} {...panResponder.panHandlers}>
        <Svg width={SIZE} height={SIZE}>
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke="#EAF0FF"
            strokeWidth={STROKE}
            fill="none"
          />
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke="#407BFF"
            strokeWidth={STROKE}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
          {/* Poignée visuelle sur le tracé, pour indiquer qu'on peut glisser */}
          <Circle
            cx={SIZE / 2 + RADIUS * Math.sin(progress * 2 * Math.PI)}
            cy={SIZE / 2 - RADIUS * Math.cos(progress * 2 * Math.PI)}
            r={STROKE / 2 + 2}
            fill="#FFFFFF"
            stroke="#407BFF"
            strokeWidth={3}
          />
        </Svg>
        <View style={styles.ringCenter} pointerEvents="none">
          <Ionicons name="walk" size={28} color="#407BFF" />
          <Text style={styles.value}>{clamped.toLocaleString("fr-FR")}</Text>
          <Text style={styles.unit}>pas / jour</Text>
        </View>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.roundButton}
          onPress={() => adjust(-STEP)}
          disabled={clamped <= MIN_STEPS}
        >
          <Ionicons name="remove" size={22} color="#407BFF" />
        </TouchableOpacity>
        <Text style={styles.stepHint}>500 pas</Text>
        <TouchableOpacity
          style={[styles.roundButton, styles.roundButtonPrimary]}
          onPress={() => adjust(STEP)}
          disabled={clamped >= MAX_STEPS}
        >
          <Ionicons name="add" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default StepGoalPicker;

const styles = StyleSheet.create({
  container: { alignItems: "center" },
  ringWrap: {
    width: SIZE,
    height: SIZE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  ringCenter: { position: "absolute", alignItems: "center" },
  value: { marginTop: 4, fontSize: 28, fontWeight: "800", color: "#407BFF" },
  unit: { fontSize: 13, color: "#64748B", fontWeight: "600" },
  controls: { marginTop: 8, flexDirection: "row", alignItems: "center", gap: 16 },
  roundButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EAF0FF",
    alignItems: "center",
    justifyContent: "center",
  },
  roundButtonPrimary: { backgroundColor: "#407BFF" },
  stepHint: { color: "#64748B", fontWeight: "600" },
});