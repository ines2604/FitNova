import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";

import ScreenHeader from "@/components/nutrition/ScreenHeader";
import EmptyState from "@/components/nutrition/EmptyState";
import FavoriteButton from "@/components/nutrition/FavoriteButton";

import { getExerciseById } from "@/services/exercises.service";
import { Exercise } from "@/types/exercise";
import {
  bodyPartLabel,
  equipmentLabel,
  muscleLabel,
  formatExerciseName,
  splitInstructionSteps,
  MEDIA_ATTRIBUTION,
} from "@/utils/exerciseLabels";

// Langue des instructions (le backend renvoie le français par défaut, avec
// repli sur l'anglais si une traduction manquait).
const LANG = "fr";

// Démonstration animée de l'exercice : le GIF du dataset. Si le GIF ne se
// charge pas (réseau, lien cassé), on retombe sur la vignette, puis sur une
// icône, plutôt que d'afficher une zone vide.
function ExerciseMedia({ gifUrl, imageUrl }: { gifUrl: string | null; imageUrl: string | null }) {
  const [gifFailed, setGifFailed] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  if (gifUrl && !gifFailed) {
    return (
      <View style={styles.mediaWrap}>
        <Image
          source={{ uri: gifUrl }}
          style={styles.media}
          resizeMode="contain"
          onError={() => setGifFailed(true)}
        />
      </View>
    );
  }

  if (imageUrl && !imageFailed) {
    return (
      <View style={styles.mediaWrap}>
        <Image
          source={{ uri: imageUrl }}
          style={styles.media}
          resizeMode="contain"
          onError={() => setImageFailed(true)}
        />
      </View>
    );
  }

  return (
    <View style={[styles.mediaWrap, styles.mediaPlaceholder]}>
      <Ionicons name="barbell-outline" size={40} color="#94A3B8" />
    </View>
  );
}

export default function WorkoutsExerciseDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getExerciseById(id)
      .then(setExercise)
      .catch((e: any) => setError(e?.message || "Impossible de charger cet exercice"))
      .finally(() => setLoading(false));
  }, [id]);

  // Sécurité : secondary_muscles doit toujours être un tableau, même si l'API
  // renvoie une chaîne JSON, null ou une valeur absente.
  const secondaryMuscles: string[] = Array.isArray(exercise?.secondary_muscles)
    ? exercise!.secondary_muscles
    : [];

  // Instructions en français (repli sur l'anglais), découpées en étapes numérotées.
  const instructionsText: string =
    exercise?.instructions?.[LANG] ?? exercise?.instructions?.en ?? "";
  const steps: string[] = splitInstructionSteps(instructionsText);

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScreenHeader
        title={exercise ? formatExerciseName(exercise.name) : "Exercice"}
        rightElement={
          exercise ? (
            <FavoriteButton
              size={22}
              item={{
                itemType: "exercise",
                refId: String(exercise.id),
                name: exercise.name,
                imageUrl: exercise.image,
                source: "exercice",
              }}
            />
          ) : undefined
        }
      />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#22C55E" />
        </View>
      ) : error || !exercise ? (
        <EmptyState icon="alert-circle-outline" title={error || "Exercice introuvable"} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <ExerciseMedia gifUrl={exercise.gif_url} imageUrl={exercise.image} />

          <View style={styles.tagsRow}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{bodyPartLabel(exercise.body_part)}</Text>
            </View>
            {exercise.equipment ? (
              <View style={[styles.tag, styles.tagAlt]}>
                <Text style={[styles.tagText, styles.tagTextAlt]}>
                  {equipmentLabel(exercise.equipment)}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Muscles ciblés</Text>
            <Text style={styles.label}>Muscle principal</Text>
            <Text style={styles.value}>{muscleLabel(exercise.target)}</Text>

            {exercise.muscle_group ? (
              <>
                <Text style={[styles.label, { marginTop: 10 }]}>Groupe musculaire</Text>
                <Text style={styles.value}>{muscleLabel(exercise.muscle_group)}</Text>
              </>
            ) : null}

            {secondaryMuscles.length > 0 ? (
              <>
                <Text style={[styles.label, { marginTop: 10 }]}>Muscles secondaires</Text>
                <View style={styles.chipsWrap}>
                  {secondaryMuscles.map((muscle) => (
                    <View key={muscle} style={styles.muscleChip}>
                      <Text style={styles.muscleChipText}>{muscleLabel(muscle)}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : null}
          </View>

          {steps.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Instructions</Text>
              {steps.map((step, index) => (
                <View key={index} style={styles.stepRow}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Mention obligatoire des conditions d'utilisation des médias du dataset. */}
          <Text style={styles.attribution}>{MEDIA_ATTRIBUTION}</Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F4F7FF" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: 16, paddingBottom: 32 },
  mediaWrap: {
    width: "100%",
    height: 260,
    borderRadius: 16,
    backgroundColor: "#fff",
    overflow: "hidden",
    marginBottom: 14,
  },
  media: { width: "100%", height: "100%" },
  mediaPlaceholder: { alignItems: "center", justifyContent: "center", backgroundColor: "#F1F5F9" },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 14 },
  tag: {
    backgroundColor: "#E9FBF0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 6,
  },
  tagAlt: { backgroundColor: "#EAF1FF" },
  tagText: { fontSize: 13, fontWeight: "700", color: "#22C55E" },
  tagTextAlt: { color: "#407BFF" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTitle: { fontSize: 15, fontWeight: "800", color: "#1E293B", marginBottom: 10 },
  label: { fontSize: 12, fontWeight: "700", color: "#94A3B8" },
  value: { fontSize: 15, fontWeight: "600", color: "#1E293B", marginTop: 2 },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", marginTop: 6 },
  muscleChip: {
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 6,
    marginBottom: 6,
  },
  muscleChipText: { fontSize: 12, fontWeight: "600", color: "#475569" },
  stepRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 12 },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E9FBF0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    marginTop: 1,
  },
  stepBadgeText: { fontSize: 12, fontWeight: "800", color: "#22C55E" },
  stepText: { flex: 1, fontSize: 14, color: "#475569", lineHeight: 21 },
  attribution: { fontSize: 11, color: "#94A3B8", textAlign: "center", marginTop: 4 },
});
