import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

import ScreenHeader from "@/components/nutrition/ScreenHeader";
import { setExercisePickListener } from "@/utils/exercisePicker";
import { bodyPartLabel, formatExerciseName } from "@/utils/exerciseLabels";
import { getSessionById, createSession, renameSession, replaceSessionExercises } from "@/services/sessions.service";

type DraftItem = {
  key: string; // clé locale stable (id d'exercice + index d'ajout), pas l'id de session_exercises
  exerciseId: string;
  name: string;
  imageUrl: string | null;
  bodyPart: string;
  sets: number;
  durationSeconds: number | null;
  restSeconds: number;
};

export default function WorkoutsSessionBuilderScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();
  const isEditing = !!sessionId;

  const [name, setName] = useState("");
  const [items, setItems] = useState<DraftItem[]>([]);
  // Compteur pour donner une clé unique à chaque ligne ajoutée, même quand le
  // même exercice est ajouté plusieurs fois dans la séance.
  const nextKeyRef = useRef(0);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);

  // Charge la séance existante en mode édition.
  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    getSessionById(sessionId)
      .then((session) => {
        setName(session.name);
        setItems(
          session.exercises.map((se) => ({
            key: `existing-${se.id}`,
            exerciseId: se.exercise_id,
            name: se.exercise_name,
            imageUrl: se.image,
            bodyPart: se.body_part,
            sets: se.sets,
            durationSeconds: se.duration_seconds ?? 60,
            restSeconds: se.rest_seconds,
          }))
        );
      })
      .catch((e: any) => Alert.alert("Erreur", e?.message || "Impossible de charger la séance"))
      .finally(() => setLoading(false));
  }, [sessionId]);

  // Écoute les exercices choisis depuis l'écran "workouts-exercises" en mode sélection.
  useEffect(() => {
    setExercisePickListener((exercise) => {
      // Le même exercice peut être ajouté plusieurs fois : chaque ajout est une ligne à part.
      nextKeyRef.current += 1;
      const key = `new-${exercise.id}-${nextKeyRef.current}`;
      setItems((prev) => [
        ...prev,
        {
          key,
          exerciseId: exercise.id,
          name: exercise.name,
          imageUrl: exercise.imageUrl,
          bodyPart: exercise.bodyPart,
          sets: 3,
          durationSeconds: 60,
          restSeconds: 60,
        },
      ]);
    });
    return () => setExercisePickListener(null);
  }, []);

  const updateItem = (key: string, patch: Partial<DraftItem>) => {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  };

  const removeItem = (key: string) => {
    setItems((prev) => prev.filter((it) => it.key !== key));
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    setItems((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Nom manquant", "Donne un nom à ta séance.");
      return;
    }
    if (items.length === 0) {
      Alert.alert("Séance vide", "Ajoute au moins un exercice.");
      return;
    }

    setSaving(true);
    try {
      const exercisesInput = items.map((it) => ({
        exerciseId: it.exerciseId,
        sets: it.sets,
        durationSeconds: it.durationSeconds,
        restSeconds: it.restSeconds,
      }));

      if (isEditing) {
        await renameSession(sessionId!, name.trim());
        await replaceSessionExercises(sessionId!, exercisesInput);
      } else {
        await createSession({ name: name.trim(), exercises: exercisesInput });
      }
      router.back();
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Impossible d'enregistrer la séance");
    } finally {
      setSaving(false);
    }
  };

  const goPickExercise = () => {
    router.push({ pathname: "/workouts-exercises", params: { pickMode: "1" } });
  };

  // Ouvre directement le sélecteur sur l'onglet "Favoris".
  const goPickFavorite = () => {
    router.push({ pathname: "/workouts-exercises", params: { pickMode: "1", tab: "favorites" } });
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScreenHeader title={isEditing ? "Modifier la séance" : "Nouvelle séance"} />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#22C55E" />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Nom de la séance (ex : Full body débutant)"
              placeholderTextColor="#94A3B8"
              style={styles.nameInput}
            />

            {items.map((item, index) => (
              <View key={item.key} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
                  ) : (
                    <View style={[styles.itemImage, styles.itemImagePlaceholder]}>
                      <Ionicons name="barbell-outline" size={18} color="#94A3B8" />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {formatExerciseName(item.name)}
                    </Text>
                    <Text style={styles.itemMeta}>{bodyPartLabel(item.bodyPart)}</Text>
                  </View>
                  <View style={styles.reorderCol}>
                    <Pressable
                      hitSlop={6}
                      disabled={index === 0}
                      onPress={() => moveItem(index, -1)}
                    >
                      <Ionicons name="chevron-up" size={18} color={index === 0 ? "#CBD5E1" : "#407BFF"} />
                    </Pressable>
                    <Pressable
                      hitSlop={6}
                      disabled={index === items.length - 1}
                      onPress={() => moveItem(index, 1)}
                    >
                      <Ionicons
                        name="chevron-down"
                        size={18}
                        color={index === items.length - 1 ? "#CBD5E1" : "#407BFF"}
                      />
                    </Pressable>
                  </View>
                  <Pressable hitSlop={6} onPress={() => removeItem(item.key)} style={{ marginLeft: 6 }}>
                    <Ionicons name="close-circle" size={20} color="#E5493A" />
                  </Pressable>
                </View>

                <View style={styles.fieldsRow}>
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Séries</Text>
                    <Stepper
                      value={item.sets}
                      min={1}
                      max={20}
                      onChange={(v) => updateItem(item.key, { sets: v })}
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Durée / série (s)</Text>
                    <TextInput
                      style={styles.numberInput}
                      keyboardType="number-pad"
                      placeholder="—"
                      placeholderTextColor="#CBD5E1"
                      value={item.durationSeconds != null ? String(item.durationSeconds) : ""}
                      onChangeText={(txt) =>
                        updateItem(item.key, {
                          durationSeconds: txt ? Math.max(0, parseInt(txt, 10) || 0) : null,
                        })
                      }
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Repos (s)</Text>
                    <TextInput
                      style={styles.numberInput}
                      keyboardType="number-pad"
                      value={String(item.restSeconds)}
                      onChangeText={(txt) =>
                        updateItem(item.key, { restSeconds: Math.max(0, parseInt(txt, 10) || 0) })
                      }
                    />
                  </View>
                </View>
              </View>
            ))}

            <Pressable style={styles.addExerciseBtn} onPress={goPickExercise}>
              <Ionicons name="add-circle-outline" size={20} color="#22C55E" />
              <Text style={styles.addExerciseBtnText}>Ajouter un exercice</Text>
            </Pressable>

            <Pressable style={styles.addFavoriteBtn} onPress={goPickFavorite}>
              <Ionicons name="heart-outline" size={20} color="#EF4444" />
              <Text style={styles.addFavoriteBtnText}>Choisir dans mes favoris</Text>
            </Pressable>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Enregistrer la séance</Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

function Stepper({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable
        style={styles.stepperBtn}
        onPress={() => onChange(Math.max(min, value - 1))}
        hitSlop={6}
      >
        <Ionicons name="remove" size={16} color="#407BFF" />
      </Pressable>
      <Text style={styles.stepperValue}>{value}</Text>
      <Pressable
        style={styles.stepperBtn}
        onPress={() => onChange(Math.min(max, value + 1))}
        hitSlop={6}
      >
        <Ionicons name="add" size={16} color="#407BFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F4F7FF" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: 16, paddingBottom: 24 },
  nameInput: {
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 14,
  },
  itemCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  itemHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  itemImage: { width: 40, height: 40, borderRadius: 10, marginRight: 10, backgroundColor: "#F1F5F9" },
  itemImagePlaceholder: { alignItems: "center", justifyContent: "center" },
  itemName: { fontSize: 14, fontWeight: "700", color: "#1E293B" },
  itemMeta: { fontSize: 12, color: "#94A3B8" },
  reorderCol: { marginLeft: 6 },
  fieldsRow: { flexDirection: "row", justifyContent: "space-between" },
  field: { flex: 1, alignItems: "center" },
  fieldLabel: { fontSize: 11, color: "#94A3B8", fontWeight: "700", marginBottom: 6 },
  stepper: { flexDirection: "row", alignItems: "center", backgroundColor: "#EAF1FF", borderRadius: 10, paddingHorizontal: 4 },
  stepperBtn: { padding: 6 },
  stepperValue: { fontSize: 14, fontWeight: "700", color: "#1E293B", minWidth: 20, textAlign: "center" },
  numberInput: {
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
    textAlign: "center",
    minWidth: 56,
  },
  addExerciseBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#22C55E",
    borderStyle: "dashed",
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 4,
    gap: 8,
  },
  addExerciseBtnText: { color: "#22C55E", fontWeight: "700", fontSize: 14 },
  addFavoriteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#EF4444",
    borderStyle: "dashed",
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 10,
    gap: 8,
  },
  addFavoriteBtnText: { color: "#EF4444", fontWeight: "700", fontSize: 14 },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    backgroundColor: "#F4F7FF",
  },
  saveBtn: {
    backgroundColor: "#22C55E",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});