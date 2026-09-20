import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  ActivityIndicator,
  ScrollView,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";

import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import ScreenHeader from "@/components/nutrition/ScreenHeader";
import Chip from "@/components/nutrition/Chip";
import EmptyState from "@/components/nutrition/EmptyState";
import ExerciseListItem from "@/components/workouts/ExerciseListItem";

import {
  searchExercises,
  getExerciseFilters,
  getFavoriteExercises,
} from "@/services/exercises.service";
import { Exercise, ExerciseFilterOptions } from "@/types/exercise";
import { pickExercise } from "@/utils/exercisePicker";
import { bodyPartLabel, equipmentLabel } from "@/utils/exerciseLabels";

const PAGE_SIZE = 20;

type Tab = "all" | "favorites";

export default function WorkoutsExercisesScreen() {
  const router = useRouter();
  const { pickMode, tab: tabParam } = useLocalSearchParams<{ pickMode?: string; tab?: string }>();
  const isPicking = pickMode === "1";

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 400);

  const [bodyPart, setBodyPart] = useState<string | null>(null);
  const [equipment, setEquipment] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filterOptions, setFilterOptions] = useState<ExerciseFilterOptions>({
    bodyParts: [],
    equipments: [],
  });

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  // Onglet "Favoris" : liste complète (petite) chargée en une fois, puis
  // filtrée côté client avec la même recherche et les mêmes filtres.
  const [tab, setTab] = useState<Tab>(tabParam === "favorites" ? "favorites" : "all");
  const [favorites, setFavorites] = useState<Exercise[]>([]);
  const [favLoading, setFavLoading] = useState(true);
  const [favError, setFavError] = useState("");

  const loadFavorites = useCallback(async () => {
    try {
      const data = await getFavoriteExercises();
      setFavorites(data.items);
      setFavError("");
    } catch (e: any) {
      setFavError(e?.message || "Impossible de charger tes favoris");
    } finally {
      setFavLoading(false);
    }
  }, []);

  // Recharge à chaque retour sur l'écran (ex. après avoir retiré un favori
  // depuis la fiche d'un exercice).
  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [loadFavorites])
  );

  // Garde l'onglet Favoris synchronisé quand on utilise le cœur d'une carte,
  // sans attendre un rechargement.
  const handleFavoriteChange = (exercise: Exercise, isFavorite: boolean) => {
    setFavorites((prev) =>
      isFavorite
        ? prev.some((e) => e.id === exercise.id)
          ? prev
          : [exercise, ...prev]
        : prev.filter((e) => e.id !== exercise.id)
    );
  };

  const filteredFavorites = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return favorites.filter(
      (ex) =>
        (!q || ex.name.toLowerCase().includes(q)) &&
        (!bodyPart || ex.body_part === bodyPart) &&
        (!equipment || ex.equipment === equipment)
    );
  }, [favorites, debouncedQuery, bodyPart, equipment]);

  // Charge les valeurs de filtre une seule fois.
  useEffect(() => {
    getExerciseFilters()
      .then(setFilterOptions)
      .catch(() => {
        // Non bloquant : les filtres restent vides si l'appel échoue.
      });
  }, []);

  const runSearch = useCallback(
    async (targetPage: number, append: boolean) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError("");

      try {
        const result = await searchExercises({
          q: debouncedQuery.trim() || undefined,
          bodyPart: bodyPart || undefined,
          equipment: equipment || undefined,
          page: targetPage,
          limit: PAGE_SIZE,
        });
        setExercises((prev) => (append ? [...prev, ...result.items] : result.items));
        setTotal(result.total);
        setPage(result.page);
      } catch (e: any) {
        console.error("Erreur recherche exercices :", e?.status, e?.message);
        setError(e?.message || "Impossible de charger les exercices");
        if (!append) setExercises([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [debouncedQuery, bodyPart, equipment]
  );

  // Relance la recherche à la page 1 quand le texte ou les filtres changent.
  useEffect(() => {
    runSearch(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, bodyPart, equipment]);

  const loadMore = () => {
    if (loadingMore || loading) return;
    if (exercises.length >= total) return;
    runSearch(page + 1, true);
  };

  const activeFiltersCount = (bodyPart ? 1 : 0) + (equipment ? 1 : 0);

  const openDetails = (exercise: Exercise) => {
    if (isPicking) {
      pickExercise({
        id: exercise.id,
        name: exercise.name,
        imageUrl: exercise.image,
        bodyPart: exercise.body_part,
      });
      router.back();
      return;
    }
    router.push({
      pathname: "/workouts-exercise-details",
      params: { id: exercise.id },
    });
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScreenHeader title={isPicking ? "Choisir un exercice" : "Exercices"} />

      <View style={styles.segment}>
        <Pressable
          style={[styles.segmentBtn, tab === "all" && styles.segmentBtnActive]}
          onPress={() => setTab("all")}
        >
          <Ionicons
            name="barbell-outline"
            size={16}
            color={tab === "all" ? "#fff" : "#64748B"}
          />
          <Text style={[styles.segmentText, tab === "all" && styles.segmentTextActive]}>
            Tous
          </Text>
        </Pressable>
        <Pressable
          style={[styles.segmentBtn, tab === "favorites" && styles.segmentBtnActive]}
          onPress={() => setTab("favorites")}
        >
          <Ionicons
            name={tab === "favorites" ? "heart" : "heart-outline"}
            size={16}
            color={tab === "favorites" ? "#fff" : "#EF4444"}
          />
          <Text style={[styles.segmentText, tab === "favorites" && styles.segmentTextActive]}>
            Favoris
          </Text>
          {favorites.length > 0 ? (
            <View
              style={[styles.segmentCount, tab === "favorites" && styles.segmentCountActive]}
            >
              <Text
                style={[
                  styles.segmentCountText,
                  tab === "favorites" && styles.segmentCountTextActive,
                ]}
              >
                {favorites.length}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={
            tab === "favorites"
              ? "Chercher dans mes favoris..."
              : "Chercher un exercice (ex : squat, pompes...)"
          }
          placeholderTextColor="#94A3B8"
          style={styles.searchInput}
          returnKeyType="search"
        />
        <Pressable
          onPress={() => setShowFilters((v) => !v)}
          style={[styles.filterBtn, activeFiltersCount > 0 && styles.filterBtnActive]}
        >
          <Ionicons
            name="options-outline"
            size={18}
            color={activeFiltersCount > 0 ? "#fff" : "#22C55E"}
          />
          {activeFiltersCount > 0 ? (
            <Text style={styles.filterBadge}>{activeFiltersCount}</Text>
          ) : null}
        </Pressable>
      </View>

      {showFilters && (
        <View style={styles.filtersPanel}>
          <Text style={styles.filterLabel}>Partie du corps</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
            <Chip label="Toutes" active={!bodyPart} onPress={() => setBodyPart(null)} />
            {filterOptions.bodyParts.map((bp) => (
              <Chip
                key={bp}
                label={bodyPartLabel(bp)}
                active={bodyPart === bp}
                onPress={() => setBodyPart(bodyPart === bp ? null : bp)}
              />
            ))}
          </ScrollView>

          <Text style={styles.filterLabel}>Équipement</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
            <Chip label="Tous" active={!equipment} onPress={() => setEquipment(null)} />
            {filterOptions.equipments.map((eq) => (
              <Chip
                key={eq}
                label={equipmentLabel(eq)}
                active={equipment === eq}
                onPress={() => setEquipment(equipment === eq ? null : eq)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {tab === "favorites" ? (
        favLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#22C55E" />
          </View>
        ) : favError ? (
          <EmptyState icon="alert-circle-outline" title={favError} />
        ) : favorites.length === 0 ? (
          <View>
            <EmptyState
              icon="heart-outline"
              title="Aucun exercice favori"
              subtitle="Appuie sur le cœur d'un exercice pour le retrouver ici et l'ajouter plus vite à tes séances."
            />
            <Pressable style={styles.browseBtn} onPress={() => setTab("all")}>
              <Ionicons name="search-outline" size={16} color="#22C55E" />
              <Text style={styles.browseBtnText}>Parcourir les exercices</Text>
            </Pressable>
          </View>
        ) : filteredFavorites.length === 0 ? (
          <EmptyState
            icon="search-outline"
            title="Aucun favori ne correspond"
            subtitle="Essaie un autre nom ou modifie tes filtres."
          />
        ) : (
          <FlatList
            data={filteredFavorites}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <ExerciseListItem
                exercise={item}
                showFavorite={!isPicking}
                onFavoriteChange={handleFavoriteChange}
                onPress={() => openDetails(item)}
              />
            )}
          />
        )
      ) : loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#22C55E" />
        </View>
      ) : error ? (
        <EmptyState icon="alert-circle-outline" title={error} />
      ) : exercises.length === 0 ? (
        <EmptyState
          icon="barbell-outline"
          title="Aucun exercice trouvé"
          subtitle="Essaie un autre nom ou modifie tes filtres."
        />
      ) : (
        <FlatList
          data={exercises}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          onEndReachedThreshold={0.4}
          onEndReached={loadMore}
          renderItem={({ item }) => (
            <ExerciseListItem
              exercise={item}
              showFavorite={!isPicking}
              onFavoriteChange={handleFavoriteChange}
              onPress={() => openDetails(item)}
            />
          )}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator size="small" color="#22C55E" style={{ marginVertical: 12 }} />
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F4F7FF" },
  segment: {
    flexDirection: "row",
    backgroundColor: "#E2E8F0",
    borderRadius: 14,
    padding: 4,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 11,
    gap: 6,
  },
  segmentBtnActive: { backgroundColor: "#22C55E" },
  segmentText: { fontSize: 14, fontWeight: "700", color: "#64748B" },
  segmentTextActive: { color: "#fff" },
  segmentCount: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  segmentCountActive: { backgroundColor: "rgba(255,255,255,0.28)" },
  segmentCountText: { fontSize: 11, fontWeight: "800", color: "#EF4444" },
  segmentCountTextActive: { color: "#fff" },
  browseBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    borderWidth: 1.5,
    borderColor: "#22C55E",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 8,
  },
  browseBtnText: { color: "#22C55E", fontWeight: "700", fontSize: 14 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 10,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#1E293B", paddingVertical: 10 },
  filterBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#E9FBF0",
    alignItems: "center",
    justifyContent: "center",
  },
  filterBtnActive: { backgroundColor: "#22C55E" },
  filterBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#E5493A",
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    width: 16,
    height: 16,
    borderRadius: 8,
    textAlign: "center",
    lineHeight: 16,
    overflow: "hidden",
  },
  filtersPanel: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    padding: 14,
  },
  filterLabel: { fontSize: 12, fontWeight: "700", color: "#64748B", marginBottom: 8, marginTop: 6 },
  chipsRow: { marginBottom: 2 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
});