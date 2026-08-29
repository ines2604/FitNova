import React, { useCallback, useEffect, useState } from "react";
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
import { useRouter } from "expo-router";
import ScreenHeader from "@/components/nutrition/ScreenHeader";
import Chip from "@/components/nutrition/Chip";
import MealListItem from "@/components/nutrition/MealListItem";
import EmptyState from "@/components/nutrition/EmptyState";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  filterMealsByArea,
  filterMealsByCategory,
  filterMealsByIngredient,
  getMealAreas,
  getMealCategories,
  getRandomMeal,
  getRandomMealsPool,
  searchMealsByName,
} from "@/services/theMealDb.service";
import { MealCategory, MealSearchMode, MealSummary } from "@/types/nutrition";

const RANDOM_POOL_SIZE = 50;

const MODES: { value: MealSearchMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "name", label: "Nom", icon: "search-outline" },
  { value: "category", label: "Catégorie", icon: "grid-outline" },
  { value: "area", label: "Origine", icon: "earth-outline" },
  { value: "ingredient", label: "Ingrédient", icon: "leaf-outline" },
];

export default function NutritionMealsScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<MealSearchMode>("name");
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 450);

  const [categories, setCategories] = useState<MealCategory[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);

  const [meals, setMeals] = useState<MealSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [randomLoading, setRandomLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const [discoverMeals, setDiscoverMeals] = useState<MealSummary[]>([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);

  // Charge les listes de catégories/origines une seule fois pour les filtres.
  useEffect(() => {
    getMealCategories().then(setCategories).catch(() => {});
    getMealAreas()
      .then((list) => {
        // On déduplique : l'API peut renvoyer des doublons, ce qui casse
        // les clés React (et donc le rendu de la liste des chips).
        const unique = Array.from(
          new Set(list.filter((a): a is string => typeof a === "string" && a.trim().length > 0))
        );
        setAreas(unique);
      })
      .catch(() => setAreas([]));
  }, []);

  const loadDiscoverMeals = useCallback(async () => {
    setDiscoverLoading(true);
    try {
      const pool = await getRandomMealsPool(RANDOM_POOL_SIZE);
      setDiscoverMeals(pool);
    } catch {
      setDiscoverMeals([]);
    } finally {
      setDiscoverLoading(false);
    }
  }, []);

  // Charge une sélection de repas aléatoires à afficher avant toute recherche.
  useEffect(() => {
    loadDiscoverMeals();
  }, [loadDiscoverMeals]);

  const runSearch = useCallback(async () => {
    try {
      setError("");
      if (mode === "name") {
        if (!debouncedQuery.trim()) {
          setMeals([]);
          setHasSearched(false);
          return;
        }
        setLoading(true);
        setMeals(await searchMealsByName(debouncedQuery.trim()));
        setHasSearched(true);
      } else if (mode === "ingredient") {
        if (!debouncedQuery.trim()) {
          setMeals([]);
          setHasSearched(false);
          return;
        }
        setLoading(true);
        setMeals(await filterMealsByIngredient(debouncedQuery.trim().replace(/\s+/g, "_")));
        setHasSearched(true);
      } else if (mode === "category") {
        if (!selectedCategory) {
          setMeals([]);
          setHasSearched(false);
          return;
        }
        setLoading(true);
        setMeals(await filterMealsByCategory(selectedCategory));
        setHasSearched(true);
      } else if (mode === "area") {
        if (!selectedArea) {
          setMeals([]);
          setHasSearched(false);
          return;
        }
        setLoading(true);
        setMeals(await filterMealsByArea(selectedArea));
        setHasSearched(true);
      }
    } catch (e: any) {
      setError(e?.message || "Impossible de charger les résultats");
      setMeals([]);
    } finally {
      setLoading(false);
    }
  }, [mode, debouncedQuery, selectedCategory, selectedArea]);

  useEffect(() => {
    runSearch();
  }, [runSearch]);

  const openMealDetails = (meal: MealSummary) => {
    router.push({ pathname: "/nutrition-meal-details", params: { id: meal.id } });
  };

  const handleRandom = async () => {
    setRandomLoading(true);
    try {
      const meal = await getRandomMeal();
      if (meal) openMealDetails(meal);
    } catch {
      // silencieux : l'utilisateur peut simplement réessayer
    } finally {
      setRandomLoading(false);
    }
  };

  const changeMode = (nextMode: MealSearchMode) => {
    setMode(nextMode);
    setQuery("");
    setSelectedCategory(null);
    setSelectedArea(null);
    setMeals([]);
    setHasSearched(false);
  };

  const showTextInput = mode === "name" || mode === "ingredient";

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScreenHeader title="Repas" />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modesRow}>
        {MODES.map((m) => (
          <Chip key={m.value} label={m.label} active={mode === m.value} onPress={() => changeMode(m.value)} />
        ))}
      </ScrollView>

      {showTextInput && (
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={
              mode === "name"
                ? "Chercher un repas (ex : pasta, chicken...)"
                : "Ingrédient principal (ex : chicken)"
            }
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
            autoCapitalize="none"
          />
        </View>
      )}

      {mode === "category" && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modesRow}>
          {categories.map((c) => (
            <Chip
              key={c.id}
              label={c.name}
              active={selectedCategory === c.name}
              onPress={() =>
                setSelectedCategory(selectedCategory === c.name ? null : c.name)
              }
            />
          ))}
        </ScrollView>
      )}

      {mode === "area" && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modesRow}>
          {areas.map((a, index) => (
            <Chip
              key={`${a}-${index}`}
              label={a}
              active={selectedArea === a}
              onPress={() => setSelectedArea(selectedArea === a ? null : a)}
            />
          ))}
        </ScrollView>
      )}

      <Pressable style={styles.randomBtn} onPress={handleRandom} disabled={randomLoading}>
        {randomLoading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Ionicons name="shuffle" size={16} color="#fff" />
            <Text style={styles.randomBtnText}>Repas aléatoire</Text>
          </>
        )}
      </Pressable>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#407BFF" />
        </View>
      ) : error ? (
        <EmptyState icon="alert-circle-outline" title={error} />
      ) : !hasSearched ? (
        <>
          <View style={styles.discoverHeader}>
            <Text style={styles.discoverTitle}>À découvrir</Text>
            <Pressable onPress={loadDiscoverMeals} disabled={discoverLoading} hitSlop={8}>
              <Ionicons
                name="refresh"
                size={18}
                color={discoverLoading ? "#CBD5E1" : "#407BFF"}
              />
            </Pressable>
          </View>
          {discoverLoading && discoverMeals.length === 0 ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#407BFF" />
            </View>
          ) : discoverMeals.length === 0 ? (
            <EmptyState
              icon="restaurant-outline"
              title="Trouve ton prochain repas"
              subtitle="Choisis un mode de recherche pour commencer."
            />
          ) : (
            <FlatList
              data={discoverMeals}
              keyExtractor={(item, index) => item.id || String(index)}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => (
                <MealListItem meal={item} onPress={() => openMealDetails(item)} />
              )}
            />
          )}
        </>
      ) : meals.length === 0 ? (
        <EmptyState icon="sad-outline" title="Aucun repas trouvé" />
      ) : (
        <FlatList
          data={meals}
          keyExtractor={(item, index) => item.id || String(index)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <MealListItem meal={item} onPress={() => openMealDetails(item)} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F4F7FF",
  },
  modesRow: {
    paddingHorizontal: 16,
    marginBottom: 15,
    flexGrow: 0,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#1E293B",
    paddingVertical: 10,
  },
  randomBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    backgroundColor: "#FF8A3D",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 6,
  },
  randomBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  discoverHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginBottom: 8,
  },
  discoverTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
});