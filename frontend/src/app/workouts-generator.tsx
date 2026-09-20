import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Image,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import ScreenHeader from "@/components/nutrition/ScreenHeader";
import Chip from "@/components/nutrition/Chip";
import { getProfile } from "@/services/profile.service";
import { createSession, generateSession } from "@/services/sessions.service";
import { bodyPartLabel, formatExerciseName } from "@/utils/exerciseLabels";
import {
  GeneratedSession,
  WorkoutFocus,
  WorkoutGoal,
  WorkoutLevel,
  WorkoutLocation,
} from "@/types/session";

const GOALS: { value: WorkoutGoal; label: string }[] = [
  { value: "weight_loss", label: "Perte de poids" },
  { value: "muscle_gain", label: "Prise de muscle" },
  { value: "maintenance", label: "Forme & entretien" },
];

const LEVELS: { value: WorkoutLevel; label: string }[] = [
  { value: "beginner", label: "Débutant" },
  { value: "intermediate", label: "Intermédiaire" },
  { value: "advanced", label: "Avancé" },
];

const LOCATIONS: { value: WorkoutLocation; label: string }[] = [
  { value: "home_bodyweight", label: "Maison, sans matériel" },
  { value: "home_equipment", label: "Maison, petit matériel" },
  { value: "gym", label: "Salle de sport" },
];

const FOCUSES: { value: WorkoutFocus; label: string }[] = [
  { value: "full_body", label: "Tout le corps" },
  { value: "upper_body", label: "Haut du corps" },
  { value: "lower_body", label: "Bas du corps" },
  { value: "core", label: "Abdos & gainage" },
];

const DURATIONS = [15, 20, 30, 45, 60, 90];

// 2700 -> "45 min", 3900 -> "1 h 05 min"
const formatDuration = (seconds: number) => {
  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} h`;
  return `${hours} h ${String(minutes).padStart(2, "0")} min`;
};

function OptionGroup<T extends string | number>({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={styles.chipWrap}>
        {options.map((option) => (
          <View key={String(option.value)} style={styles.chipCell}>
            <Chip
              label={option.label}
              active={value === option.value}
              onPress={() => onChange(option.value)}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

export default function WorkoutsGeneratorScreen() {
  const router = useRouter();

  const [goal, setGoal] = useState<WorkoutGoal>("maintenance");
  const [level, setLevel] = useState<WorkoutLevel>("beginner");
  const [location, setLocation] = useState<WorkoutLocation>("home_bodyweight");
  const [focus, setFocus] = useState<WorkoutFocus>("full_body");
  const [durationMinutes, setDurationMinutes] = useState(30);

  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<GeneratedSession | null>(null);
  const [name, setName] = useState("");

  // Préremplit l'objectif avec celui du profil (sans bloquer si indisponible).
  useEffect(() => {
    let active = true;
    getProfile()
      .then((profile) => {
        if (active && profile?.goal) setGoal(profile.goal as WorkoutGoal);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const handleGenerate = async () => {
    if (generating) return;
    setGenerating(true);
    setError("");
    try {
      const session = await generateSession({ goal, level, location, focus, durationMinutes });
      setResult(session);
      setName(session.name);
    } catch (e: any) {
      setResult(null);
      setError(e?.message || "Impossible de générer la séance");
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!result || saving) return;
    const finalName = name.trim() || result.name;
    setSaving(true);
    try {
      const saved = await createSession({
        name: finalName,
        exercises: result.exercises.map((ex) => ({
          exerciseId: ex.exerciseId,
          sets: ex.sets,
          durationSeconds: ex.durationSeconds,
          restSeconds: ex.restSeconds,
        })),
      });
      // Ouvre la séance dans l'éditeur pour pouvoir l'ajuster si besoin.
      router.replace({
        pathname: "/workouts-session-builder",
        params: { sessionId: String(saved.id) },
      });
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Impossible d'enregistrer la séance");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScreenHeader title="Générer une séance" />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.intro}>
          Choisis ton scénario : la séance est composée à partir de ta base d'exercices, avec le
          nombre de séries, la durée et le repos de chaque exercice.
        </Text>

        <OptionGroup title="Objectif" options={GOALS} value={goal} onChange={setGoal} />
        <OptionGroup title="Niveau" options={LEVELS} value={level} onChange={setLevel} />
        <OptionGroup title="Lieu" options={LOCATIONS} value={location} onChange={setLocation} />
        <OptionGroup title="Focus" options={FOCUSES} value={focus} onChange={setFocus} />
        <OptionGroup
          title="Durée"
          options={DURATIONS.map((d) => ({ value: d, label: `${d} min` }))}
          value={durationMinutes}
          onChange={setDurationMinutes}
        />

        <Pressable
          style={[styles.primaryBtn, generating && styles.btnDisabled]}
          onPress={handleGenerate}
          disabled={generating}
        >
          {generating ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="sparkles" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>
                {result ? "Régénérer une séance" : "Générer ma séance"}
              </Text>
            </>
          )}
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {result ? (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <View style={styles.sourceTag}>
                <Ionicons
                  name={result.source === "ai" ? "sparkles" : "construct-outline"}
                  size={12}
                  color="#22C55E"
                />
                <Text style={styles.sourceTagText}>
                  {result.source === "ai" ? "Composée par l'IA" : "Composée automatiquement"}
                </Text>
              </View>
              <View style={styles.sourceTag}>
                <Ionicons name="time-outline" size={12} color="#22C55E" />
                <Text style={styles.sourceTagText}>{formatDuration(result.totalSeconds)}</Text>
              </View>
            </View>

            <TextInput
              value={name}
              onChangeText={setName}
              style={styles.nameInput}
              placeholder="Nom de la séance"
              placeholderTextColor="#94A3B8"
              maxLength={80}
            />

            {result.warnings.map((warning) => (
              <View key={warning} style={styles.warning}>
                <Ionicons name="information-circle-outline" size={16} color="#B45309" />
                <Text style={styles.warningText}>{warning}</Text>
              </View>
            ))}

            {result.exercises.map((ex, index) => (
              <View key={ex.exerciseId} style={styles.exerciseRow}>
                <Text style={styles.exerciseIndex}>{index + 1}</Text>
                {ex.image ? (
                  <Image source={{ uri: ex.image }} style={styles.exerciseImage} />
                ) : (
                  <View style={[styles.exerciseImage, styles.exerciseImagePlaceholder]}>
                    <Ionicons name="barbell-outline" size={18} color="#94A3B8" />
                  </View>
                )}
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName} numberOfLines={1}>
                    {formatExerciseName(ex.name)}
                  </Text>
                  <Text style={styles.exerciseMeta} numberOfLines={1}>
                    {ex.sets} séries × {ex.durationSeconds} s · repos {ex.restSeconds} s
                  </Text>
                  <Text style={styles.exerciseBodyPart} numberOfLines={1}>
                    {bodyPartLabel(ex.bodyPart)}
                  </Text>
                </View>
              </View>
            ))}

            <Pressable
              style={[styles.saveBtn, saving && styles.btnDisabled]}
              onPress={handleSave}
              disabled={saving || generating}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={18} color="#fff" />
                  <Text style={styles.primaryBtnText}>Enregistrer la séance</Text>
                </>
              )}
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F4F7FF" },
  content: { paddingHorizontal: 16, paddingBottom: 32 },
  intro: { fontSize: 13, color: "#64748B", lineHeight: 19, marginBottom: 12 },
  group: { marginBottom: 14 },
  groupTitle: { fontSize: 14, fontWeight: "700", color: "#1E293B", marginBottom: 8 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap" },
  chipCell: { marginBottom: 8 },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#22C55E",
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 6,
  },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  btnDisabled: { opacity: 0.6 },
  error: { color: "#EF4444", fontSize: 13, marginTop: 10, textAlign: "center" },
  resultCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 14,
    marginTop: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  resultHeader: { flexDirection: "row", gap: 8, marginBottom: 10 },
  sourceTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E9FBF0",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  sourceTagText: { fontSize: 12, fontWeight: "700", color: "#22C55E" },
  nameInput: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingVertical: 6,
    marginBottom: 10,
  },
  warning: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: "#FEF3C7",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  warningText: { flex: 1, fontSize: 12, color: "#92400E", lineHeight: 17 },
  exerciseRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  exerciseIndex: { width: 20, fontSize: 13, fontWeight: "700", color: "#94A3B8" },
  exerciseImage: { width: 46, height: 46, borderRadius: 10, marginRight: 10 },
  exerciseImagePlaceholder: {
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  exerciseInfo: { flex: 1 },
  exerciseName: { fontSize: 14, fontWeight: "700", color: "#1E293B" },
  exerciseMeta: { fontSize: 12, color: "#475569", marginTop: 2 },
  exerciseBodyPart: { fontSize: 11, color: "#94A3B8", marginTop: 1 },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#22C55E",
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 14,
  },
});
