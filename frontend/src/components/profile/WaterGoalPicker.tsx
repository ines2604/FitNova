import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Svg, { Defs, ClipPath, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";

const MIN_ML = 1000;
const MAX_ML = 4000;
const STEP_ML = 250;
const GLASS_ML = 250;

type Props = {
  value: number;
  onChange: (value: number) => void;
};

const WaterGoalPicker = ({ value, onChange }: Props) => {
  const clamped = Math.min(Math.max(value, MIN_ML), MAX_ML);

  // Le ratio de remplissage représente la quantité réelle par rapport
  // à la capacité totale de la bouteille (4L), pas la position dans
  // l'intervalle min/max de l'objectif. Sinon à 1.5L la bouteille
  // semblait quasiment vide alors qu'elle contient bien 1.5L sur 4L.
  const fillRatio = clamped / MAX_ML;

  const liters = (clamped / 1000).toFixed(1);
  const glasses = Math.round(clamped / GLASS_ML);
  const fillHeight = 8 + fillRatio * 168;

  const adjust = (delta: number) => {
    onChange(Math.min(Math.max(clamped + delta, MIN_ML), MAX_ML));
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => adjust(STEP_ML)}
        style={styles.bottleWrap}
      >
        <Svg key={clamped} width={120} height={220} viewBox="0 0 120 220">
          <Defs>
            <ClipPath id="waterFill">
              <Rect x="18" y={200 - fillHeight} width="84" height={fillHeight} rx="18" />
            </ClipPath>
            <LinearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#7AA8FF" />
              <Stop offset="1" stopColor="#407BFF" />
            </LinearGradient>
          </Defs>

          <Path
            d="M46 18 C46 10 52 6 60 6 C68 6 74 10 74 18 V38 C74 44 86 52 90 70 V188 C90 202 78 212 60 212 C42 212 30 202 30 188 V70 C34 52 46 44 46 38 Z"
            fill="#EAF0FF"
          />
          <Path
            d="M46 18 C46 10 52 6 60 6 C68 6 74 10 74 18 V38 C74 44 86 52 90 70 V188 C90 202 78 212 60 212 C42 212 30 202 30 188 V70 C34 52 46 44 46 38 Z"
            fill="url(#waterGrad)"
            clipPath="url(#waterFill)"
          />
          <Path
            d="M46 18 C46 10 52 6 60 6 C68 6 74 10 74 18 V38 C74 44 86 52 90 70 V188 C90 202 78 212 60 212 C42 212 30 202 30 188 V70 C34 52 46 44 46 38 Z"
            fill="none"
            stroke="#407BFF"
            strokeWidth="4"
          />
          <Rect x="42" y="2" width="36" height="12" rx="6" fill="#407BFF" />
        </Svg>
      </TouchableOpacity>

      <Text style={styles.value}>{liters} L</Text>
      <Text style={styles.meta}>
        {clamped} ml · {glasses} verres
      </Text>

      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.roundButton}
          onPress={() => adjust(-STEP_ML)}
          disabled={clamped <= MIN_ML}
        >
          <Ionicons name="remove" size={22} color="#407BFF" />
        </TouchableOpacity>

        <Text style={styles.stepHint}>250 ml</Text>

        <TouchableOpacity
          style={[styles.roundButton, styles.roundButtonPrimary]}
          onPress={() => adjust(STEP_ML)}
          disabled={clamped >= MAX_ML}
        >
          <Ionicons name="add" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default WaterGoalPicker;

const styles = StyleSheet.create({
  container: { alignItems: "center" },
  bottleWrap: { alignItems: "center", marginBottom: 8 },
  value: { fontSize: 36, fontWeight: "800", color: "#407BFF" },
  meta: { marginTop: 4, fontSize: 14, color: "#64748B", fontWeight: "600" },
  controls: { marginTop: 18, flexDirection: "row", alignItems: "center", gap: 16 },
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