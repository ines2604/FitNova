import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { COLORS } from "@/constants/colors";
import { addMeal } from "@/services/meals.service";
import { MealType, MEAL_TYPE_LABELS } from "@/types/meal";

type Props = {
  visible: boolean;
  mealType: MealType | null;
  date: string;
  onClose: () => void;
  onAdded: () => void;
};

type Mode = "choose" | "manual";

export default function AddMealSheet({ visible, mealType, date, onClose, onAdded }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("choose");
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setMode("choose");
    setName("");
    setCalories("");
    setProtein("");
    setCarbs("");
    setFat("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const goToBarcode = () => {
    if (!mealType) return;
    handleClose();
    router.push({ pathname: "/nutrition-scanner", params: { mealType, date } });
  };

  const goToPhoto = () => {
    if (!mealType) return;
    handleClose();
    router.push({ pathname: "/nutrition-meal-scanner", params: { mealType, date } });
  };

  const handleManualSave = async () => {
    if (!mealType || saving) return;
    const caloriesValue = parseInt(calories, 10);
    if (!name.trim()) {
      Alert.alert("Champ manquant", "Indique le nom de l'aliment.");
      return;
    }
    if (!caloriesValue || caloriesValue <= 0) {
      Alert.alert("Champ manquant", "Indique le nombre de calories consommées.");
      return;
    }
    setSaving(true);
    try {
      await addMeal({
        date,
        mealType,
        name: name.trim(),
        calories: caloriesValue,
        protein: protein ? parseFloat(protein) : null,
        carbs: carbs ? parseFloat(carbs) : null,
        fat: fat ? parseFloat(fat) : null,
        source: "manual",
      });
      handleClose();
      onAdded();
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Impossible d'ajouter cet aliment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleClose} />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.sheet}
        >
          <View style={styles.handle} />

          <Text style={styles.title}>
            Ajouter {mealType ? `— ${MEAL_TYPE_LABELS[mealType]}` : ""}
          </Text>

          {mode === "choose" ? (
            <View style={styles.optionsList}>
              <Pressable style={styles.optionRow} onPress={goToBarcode}>
                <View style={styles.optionIcon}>
                  <Ionicons name="barcode-outline" size={20} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionTitle}>Scanner un code-barres</Text>
                  <Text style={styles.optionSubtitle}>Produit emballé</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={COLORS.textFaint} />
              </Pressable>

              <Pressable style={styles.optionRow} onPress={goToPhoto}>
                <View style={styles.optionIcon}>
                  <Ionicons name="camera-outline" size={20} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionTitle}>Prendre une photo</Text>
                  <Text style={styles.optionSubtitle}>Analyse IA de ton assiette</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={COLORS.textFaint} />
              </Pressable>

              <Pressable style={styles.optionRow} onPress={() => setMode("manual")}>
                <View style={styles.optionIcon}>
                  <Ionicons name="create-outline" size={20} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionTitle}>Saisie manuelle</Text>
                  <Text style={styles.optionSubtitle}>Indiquer les calories toi-même</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={COLORS.textFaint} />
              </Pressable>
            </View>
          ) : (
            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="Nom de l'aliment"
                placeholderTextColor={COLORS.textFaint}
                value={name}
                onChangeText={setName}
              />
              <TextInput
                style={styles.input}
                placeholder="Calories (kcal)"
                placeholderTextColor={COLORS.textFaint}
                keyboardType="number-pad"
                value={calories}
                onChangeText={(t) => setCalories(t.replace(/[^0-9]/g, ""))}
              />
              <View style={styles.macroRow}>
                <TextInput
                  style={[styles.input, styles.macroInput]}
                  placeholder="Protéines g (opt.)"
                  placeholderTextColor={COLORS.textFaint}
                  keyboardType="decimal-pad"
                  value={protein}
                  onChangeText={setProtein}
                />
                <TextInput
                  style={[styles.input, styles.macroInput]}
                  placeholder="Glucides g (opt.)"
                  placeholderTextColor={COLORS.textFaint}
                  keyboardType="decimal-pad"
                  value={carbs}
                  onChangeText={setCarbs}
                />
                <TextInput
                  style={[styles.input, styles.macroInput]}
                  placeholder="Lipides g (opt.)"
                  placeholderTextColor={COLORS.textFaint}
                  keyboardType="decimal-pad"
                  value={fat}
                  onChangeText={setFat}
                />
              </View>

              <View style={styles.formActions}>
                <Pressable style={styles.backBtn} onPress={() => setMode("choose")}>
                  <Text style={styles.backBtnText}>Retour</Text>
                </Pressable>
                <Pressable
                  style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                  onPress={handleManualSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveBtnText}>Ajouter</Text>
                  )}
                </Pressable>
              </View>
            </View>
          )}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
  },
  sheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 30,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    marginBottom: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.textDark,
    marginBottom: 16,
  },
  optionsList: {
    gap: 10,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: COLORS.background,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  optionSubtitle: {
    fontSize: 12,
    color: COLORS.textFaint,
    marginTop: 2,
  },
  form: {
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.textDark,
  },
  macroRow: {
    flexDirection: "row",
    gap: 10,
  },
  macroInput: {
    flex: 1,
  },
  formActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  backBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: COLORS.background,
  },
  backBtnText: {
    color: COLORS.textMuted,
    fontWeight: "700",
    fontSize: 14,
  },
  saveBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
});