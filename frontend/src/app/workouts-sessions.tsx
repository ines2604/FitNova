import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, TextInput, FlatList, ActivityIndicator, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";

import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import ScreenHeader from "@/components/nutrition/ScreenHeader";
import EmptyState from "@/components/nutrition/EmptyState";
import Chip from "@/components/nutrition/Chip";

import { getSessions } from "@/services/sessions.service";
import { findActiveScheduledSession, startSessionNow } from "@/services/calendar.service";
import { cancelWorkoutReminder } from "@/services/notifications.service";
import { SessionSort, WorkoutSessionSummary } from "@/types/session";

const SORT_OPTIONS: { value: SessionSort; label: string }[] = [
  { value: "recent", label: "Récentes" },
  { value: "duration_asc", label: "Plus courtes" },
  { value: "duration_desc", label: "Plus longues" },
];

// Durée totale d'une séance (donnée en secondes par l'API) -> "45 min", "1 h 05 min"...
const formatDuration = (seconds: number) => {
  if (!seconds || seconds <= 0) return "—";
  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} h`;
  return `${hours} h ${minutes} min`;
};

export default function WorkoutsSessionsScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 400);
  const [sort, setSort] = useState<SessionSort>("recent");

  const [sessions, setSessions] = useState<WorkoutSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [startingId, setStartingId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    getSessions(debouncedQuery.trim() || undefined, sort)
      .then(setSessions)
      .catch((e: any) => setError(e?.message || "Impossible de charger tes séances"))
      .finally(() => setLoading(false));
  }, [debouncedQuery, sort]);

  // Recharge à chaque retour sur l'écran (après création/édition d'une séance).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleStart = async (session: WorkoutSessionSummary) => {
    setStartingId(session.id);
    try {
      const active = await findActiveScheduledSession();
      if (active) {
        Alert.alert(
          "Séance en cours",
          "Tu as déjà une séance en cours. Veux-tu la reprendre ?",
          [
            { text: "Annuler", style: "cancel" },
            {
              text: "Reprendre",
              onPress: () =>
                router.push({
                  pathname: "/workouts-active-session",
                  params: { scheduledId: String(active.id) },
                }),
            },
          ]
        );
        return;
      }
      const entry = await startSessionNow(session.id);
      await cancelWorkoutReminder(entry.id);
      router.push({
        pathname: "/workouts-active-session",
        params: { scheduledId: String(entry.id) },
      });
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Impossible de démarrer la séance");
    } finally {
      setStartingId(null);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScreenHeader
        title="Mes séances"
        rightElement={
          <Pressable
            onPress={() => router.push("/workouts-session-builder")}
            style={styles.addBtn}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </Pressable>
        }
      />

      <Pressable
        style={styles.generatorBanner}
        onPress={() => router.push("/workouts-generator")}
      >
        <View style={styles.generatorIcon}>
          <Ionicons name="sparkles" size={18} color="#22C55E" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.generatorTitle}>Générer une séance</Text>
          <Text style={styles.generatorSubtitle}>
            Objectif, niveau, lieu et durée : ta séance est composée pour toi
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
      </Pressable>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Chercher une séance par nom..."
          placeholderTextColor="#94A3B8"
          style={styles.searchInput}
        />
      </View>

      <View style={styles.sortRow}>
        {SORT_OPTIONS.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            active={sort === option.value}
            onPress={() => setSort(option.value)}
          />
        ))}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#22C55E" />
        </View>
      ) : error ? (
        <EmptyState icon="alert-circle-outline" title={error} />
      ) : sessions.length === 0 ? (
        <EmptyState
          icon="list-outline"
          title="Aucune séance pour l'instant"
          subtitle="Crée ta première séance en choisissant des exercices."
        />
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() =>
                router.push({
                  pathname: "/workouts-session-builder",
                  params: { sessionId: String(item.id) },
                })
              }
            >
              <View style={styles.cardIcon}>
                <Ionicons name="barbell" size={20} color="#22C55E" />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.name}
                </Text>
                <View style={styles.metaRow}>
                  <Text style={styles.cardMeta}>
                    {item.exercise_count} exercice{item.exercise_count > 1 ? "s" : ""}
                  </Text>
                  <View style={styles.durationTag}>
                    <Ionicons name="time-outline" size={12} color="#22C55E" />
                    <Text style={styles.durationText}>
                      {formatDuration(item.total_duration_seconds)}
                    </Text>
                  </View>
                </View>
              </View>
              <Pressable
                hitSlop={10}
                onPress={() => handleStart(item)}
                style={styles.iconBtn}
                disabled={startingId === item.id}
              >
                {startingId === item.id ? (
                  <ActivityIndicator size="small" color="#22C55E" />
                ) : (
                  <Ionicons name="play-circle" size={24} color="#22C55E" />
                )}
              </Pressable>
              <Pressable
                hitSlop={10}
                onPress={() =>
                  router.push({
                    pathname: "/workouts-session-builder",
                    params: { sessionId: String(item.id) },
                  })
                }
                style={styles.iconBtn}
              >
                <Ionicons name="create-outline" size={20} color="#407BFF" />
              </Pressable>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F4F7FF" },
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#22C55E",
    alignItems: "center",
    justifyContent: "center",
  },
  generatorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 10,
    borderRadius: 14,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: "#D1FAE5",
  },
  generatorIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#E9FBF0",
    alignItems: "center",
    justifyContent: "center",
  },
  generatorTitle: { fontSize: 14, fontWeight: "700", color: "#1E293B" },
  generatorSubtitle: { fontSize: 12, color: "#64748B", marginTop: 2 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 10,
    borderRadius: 14,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#1E293B", paddingVertical: 10 },
  sortRow: { flexDirection: "row", paddingHorizontal: 16, marginBottom: 10 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#E9FBF0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#1E293B" },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 4, gap: 8 },
  cardMeta: { fontSize: 12, color: "#94A3B8" },
  durationTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E9FBF0",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    gap: 4,
  },
  durationText: { fontSize: 12, fontWeight: "700", color: "#22C55E" },
  iconBtn: { paddingHorizontal: 6 },
});