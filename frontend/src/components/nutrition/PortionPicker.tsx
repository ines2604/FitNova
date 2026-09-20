import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FoodProduct } from "@/types/nutrition";
import {
  MAX_PORTION_GRAMS,
  MIN_PORTION_GRAMS,
  PORTION_PRESETS,
  PORTION_STEP_GRAMS,
  clampPortion,
  scaleNutrition,
} from "@/utils/portion";

type Props = {
  product: FoodProduct;
  grams: number;
  onChange: (grams: number) => void;
  disabled?: boolean;
  /** "card" : carte blanche autonome. "inline" : sans fond, à placer dans une carte existante. */
  variant?: "card" | "inline";
};

const formatMacro = (value: number | null) => (value == null ? "—" : `${value.toFixed(1)} g`);

export default function PortionPicker({
  product,
  grams,
  onChange,
  disabled = false,
  variant = "card",
}: Props) {
  // Texte du champ : pendant la saisie il peut être vide, alors que la portion
  // (`grams`) reste toujours un nombre valide.
  const [text, setText] = useState(String(grams));

  useEffect(() => {
    setText(String(grams));
  }, [grams]);

  const handleChangeText = (value: string) => {
    const digits = value.replace(/[^0-9]/g, "").slice(0, 4);
    if (digits === "") {
      setText("");
      return;
    }
    const next = Number(digits);
    if (next < MIN_PORTION_GRAMS) {
      setText(digits);
      return;
    }
    const clamped = clampPortion(next);
    setText(String(clamped));
    onChange(clamped);
  };

  // Champ laissé vide ou à 0 : on revient à la dernière portion valide.
  const handleBlur = () => setText(String(grams));

  const nutrition = scaleNutrition(product, grams);

  return (
    <View style={[styles.wrap, variant === "card" ? styles.card : styles.inline]}>
      <Text style={styles.title}>Quantité mangée</Text>

      <View style={styles.stepperRow}>
        <Pressable
          style={[styles.stepBtn, disabled && styles.disabled]}
          onPress={() => onChange(clampPortion(grams - PORTION_STEP_GRAMS))}
          disabled={disabled || grams <= MIN_PORTION_GRAMS}
          hitSlop={8}
        >
          <Ionicons name="remove" size={20} color="#407BFF" />
        </Pressable>

        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={handleChangeText}
            onBlur={handleBlur}
            keyboardType="number-pad"
            maxLength={4}
            selectTextOnFocus
            editable={!disabled}
            selectionColor="#407BFF"
          />
          <Text style={styles.unit}>g</Text>
        </View>

        <Pressable
          style={[styles.stepBtn, disabled && styles.disabled]}
          onPress={() => onChange(clampPortion(grams + PORTION_STEP_GRAMS))}
          disabled={disabled || grams >= MAX_PORTION_GRAMS}
          hitSlop={8}
        >
          <Ionicons name="add" size={20} color="#407BFF" />
        </Pressable>
      </View>

      <View style={styles.presetsRow}>
        {PORTION_PRESETS.map((preset) => {
          const active = preset === grams;
          return (
            <Pressable
              key={preset}
              style={[styles.preset, active && styles.presetActive, disabled && styles.disabled]}
              onPress={() => onChange(preset)}
              disabled={disabled}
            >
              <Text style={[styles.presetText, active && styles.presetTextActive]}>
                {preset} g
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.summary}>
        <Text style={styles.summaryCalories}>{nutrition.calories} kcal</Text>
        <Text style={styles.summaryMacros}>
          Prot. {formatMacro(nutrition.protein)} · Gluc. {formatMacro(nutrition.carbs)} · Lip.{" "}
          {formatMacro(nutrition.fat)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  inline: {
    marginTop: 14,
  },
  title: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 12,
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EAF1FF",
    alignItems: "center",
    justifyContent: "center",
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 110,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#407BFF",
    backgroundColor: "#F8FAFF",
  },
  input: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1E293B",
    textAlign: "center",
    minWidth: 52,
    padding: 0,
  },
  unit: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748B",
    marginLeft: 4,
  },
  presetsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
  },
  preset: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#F1F5F9",
  },
  presetActive: {
    backgroundColor: "#407BFF",
  },
  presetText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  presetTextActive: {
    color: "#fff",
  },
  disabled: {
    opacity: 0.5,
  },
  summary: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    alignItems: "center",
  },
  summaryCalories: {
    fontSize: 22,
    fontWeight: "800",
    color: "#407BFF",
  },
  summaryMacros: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
    textAlign: "center",
  },
});
