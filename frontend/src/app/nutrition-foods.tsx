import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

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

import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import ScreenHeader from "@/components/nutrition/ScreenHeader";
import Chip from "@/components/nutrition/Chip";
import FoodListItem from "@/components/nutrition/FoodListItem";
import EmptyState from "@/components/nutrition/EmptyState";

import {
  CATEGORY_OPTIONS,
  DIET_OPTIONS,
  getRandomFoodsPool,
  searchFood,
} from "@/services/openFoodFacts.service";

import { FoodProduct, FoodSortBy } from "@/types/nutrition";

// Nombre d'aliments affichés à l'ouverture et lors du rafraîchissement
const RANDOM_POOL_SIZE = 50;

const CALORIE_RANGES: {
  label: string;
  max?: number;
  min?: number;
}[] = [
  { label: "Toutes" },
  { label: "< 100 kcal", max: 100 },
  { label: "100–300 kcal", min: 100, max: 300 },
  { label: "> 300 kcal", min: 300 },
];

const SORT_OPTIONS: {
  value: FoodSortBy;
  label: string;
}[] = [
  { value: "relevance", label: "Pertinence" },
  { value: "calories_asc", label: "Calories ↑" },
  { value: "calories_desc", label: "Calories ↓" },
  { value: "protein_desc", label: "Protéines" },
  { value: "nutriscore", label: "Nutri-Score" },
];

export default function NutritionFoodsScreen() {
  const router = useRouter();

  // =========================
  // RECHERCHE
  // =========================

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 450);

  // =========================
  // FILTRES
  // =========================

  const [category, setCategory] = useState<string | null>(null);
  const [dietLabel, setDietLabel] = useState<string | null>(null);
  const [calorieRangeIndex, setCalorieRangeIndex] = useState(0);
  const [sortBy, setSortBy] =
    useState<FoodSortBy>("relevance");

  const [showFilters, setShowFilters] = useState(false);

  // =========================
  // RÉSULTATS DE RECHERCHE
  // =========================

  const [products, setProducts] = useState<FoodProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  // =========================
  // ALIMENTS À DÉCOUVRIR
  // =========================

  const [discoverFoods, setDiscoverFoods] =
    useState<FoodProduct[]>([]);

  const [discoverLoading, setDiscoverLoading] =
    useState(false);

  // Ref utilisé pour empêcher plusieurs requêtes
  // simultanées lors du rafraîchissement.
  const discoverLoadingRef = useRef(false);

  // =========================
  // CHARGER LES ALIMENTS ALÉATOIRES
  // =========================

  const loadDiscoverFoods = useCallback(async () => {
    // Si une requête est déjà en cours,
    // on ne lance pas une deuxième requête.
    if (discoverLoadingRef.current) {
      return;
    }

    discoverLoadingRef.current = true;
    setDiscoverLoading(true);

    try {
      const pool = await getRandomFoodsPool(
        RANDOM_POOL_SIZE
      );

      // Ne remplace la liste que si l'API
      // a réellement retourné des aliments.
      if (pool.length > 0) {
        setDiscoverFoods(pool);
      }
    } catch (error: any) {
      console.error(
        "Erreur lors du rafraîchissement :",
        error?.response?.status,
        error?.message
      );

      // On garde l'ancienne liste si la requête échoue.
      // Cela évite d'avoir une liste vide à cause
      // d'une erreur temporaire de l'API.
    } finally {
      discoverLoadingRef.current = false;
      setDiscoverLoading(false);
    }
  }, []);

  // =========================
  // CHARGEMENT INITIAL
  // =========================

  useEffect(() => {
    loadDiscoverFoods();
  }, [loadDiscoverFoods]);

  // =========================
  // RECHERCHE
  // =========================

  const runSearch = useCallback(async () => {
    const hasQuery =
      debouncedQuery.trim().length > 0;

    const hasFilters =
      !!category ||
      !!dietLabel ||
      calorieRangeIndex > 0;

    // Aucun texte et aucun filtre :
    // on affiche la liste "À découvrir".
    if (!hasQuery && !hasFilters) {
      setProducts([]);
      setHasSearched(false);
      setError("");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const range =
        CALORIE_RANGES[calorieRangeIndex];

      const result = await searchFood({
        query:
          debouncedQuery.trim() || undefined,

        category:
          category || undefined,

        dietLabel:
          dietLabel || undefined,

        minCalories:
          range.min,

        maxCalories:
          range.max,

        sortBy,
      });

      setProducts(result.products);
      setHasSearched(true);
    } catch (e: any) {
      console.error(
        "Erreur recherche aliments :",
        e?.response?.status,
        e?.message
      );

      setError(
        e?.message ||
          "Impossible de charger les résultats"
      );

      setProducts([]);
      setHasSearched(true);
    } finally {
      setLoading(false);
    }
  }, [
    debouncedQuery,
    category,
    dietLabel,
    calorieRangeIndex,
    sortBy,
  ]);

  // Lancer la recherche quand :
  // - le texte change
  // - un filtre change
  // - le tri change
  useEffect(() => {
    runSearch();
  }, [runSearch]);

  // =========================
  // NOMBRE DE FILTRES ACTIFS
  // =========================

  const activeFiltersCount =
    (category ? 1 : 0) +
    (dietLabel ? 1 : 0) +
    (calorieRangeIndex > 0 ? 1 : 0);

  // =========================
  // DÉTAIL D'UN ALIMENT
  // =========================

  const openFoodDetails = (
    food: FoodProduct
  ) => {
    router.push({
      pathname: "/nutrition-food-details",
      params: {
        barcode: food.id,
      },
    });
  };

  // =========================
  // AFFICHAGE
  // =========================

  return (
    <SafeAreaView
      style={styles.screen}
      edges={["top"]}
    >
      <ScreenHeader title="Aliments" />

      {/* =========================
          BARRE DE RECHERCHE
          ========================= */}

      <View style={styles.searchBar}>
        <Ionicons
          name="search"
          size={18}
          color="#94A3B8"
          style={{ marginRight: 8 }}
        />

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Chercher un aliment (ex : pomme, yaourt...)"
          placeholderTextColor="#94A3B8"
          style={styles.searchInput}
          returnKeyType="search"
        />

        <Pressable
          onPress={() =>
            setShowFilters((v) => !v)
          }
          style={[
            styles.filterBtn,
            activeFiltersCount > 0 &&
              styles.filterBtnActive,
          ]}
        >
          <Ionicons
            name="options-outline"
            size={18}
            color={
              activeFiltersCount > 0
                ? "#fff"
                : "#407BFF"
            }
          />

          {activeFiltersCount > 0 ? (
            <Text style={styles.filterBadge}>
              {activeFiltersCount}
            </Text>
          ) : null}
        </Pressable>
      </View>

      {/* =========================
          FILTRES
          ========================= */}

      {showFilters && (
        <View style={styles.filtersPanel}>
          {/* Régime */}

          <Text style={styles.filterLabel}>
            Objectif / régime
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsRow}
          >
            <Chip
              label="Tous"
              active={!dietLabel}
              onPress={() =>
                setDietLabel(null)
              }
            />

            {DIET_OPTIONS.map((d) => (
              <Chip
                key={d.value}
                label={d.label}
                active={
                  dietLabel === d.value
                }
                onPress={() =>
                  setDietLabel(
                    dietLabel === d.value
                      ? null
                      : d.value
                  )
                }
              />
            ))}
          </ScrollView>

          {/* Catégorie */}

          <Text style={styles.filterLabel}>
            Catégorie
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsRow}
          >
            <Chip
              label="Toutes"
              active={!category}
              onPress={() =>
                setCategory(null)
              }
            />

            {CATEGORY_OPTIONS.map((c) => (
              <Chip
                key={c.value}
                label={c.label}
                active={
                  category === c.value
                }
                onPress={() =>
                  setCategory(
                    category === c.value
                      ? null
                      : c.value
                  )
                }
              />
            ))}
          </ScrollView>

          {/* Calories */}

          <Text style={styles.filterLabel}>
            Calories (pour 100g)
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsRow}
          >
            {CALORIE_RANGES.map(
              (range, index) => (
                <Chip
                  key={range.label}
                  label={range.label}
                  active={
                    calorieRangeIndex ===
                    index
                  }
                  onPress={() =>
                    setCalorieRangeIndex(
                      index
                    )
                  }
                />
              )
            )}
          </ScrollView>

          {/* Tri */}

          <Text style={styles.filterLabel}>
            Trier par
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsRow}
          >
            {SORT_OPTIONS.map((s) => (
              <Chip
                key={s.value}
                label={s.label}
                active={
                  sortBy === s.value
                }
                onPress={() =>
                  setSortBy(s.value)
                }
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* =========================
          CONTENU
          ========================= */}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator
            size="large"
            color="#407BFF"
          />
        </View>
      ) : error ? (
        <EmptyState
          icon="alert-circle-outline"
          title={error}
        />
      ) : !hasSearched ? (
        <>
          {/* =========================
              À DÉCOUVRIR
              ========================= */}

          <View
            style={styles.discoverHeader}
          >
            <Text
              style={styles.discoverTitle}
            >
              À découvrir
            </Text>

            <Pressable
              onPress={loadDiscoverFoods}
              disabled={discoverLoading}
              hitSlop={8}
            >
              <Ionicons
                name="refresh"
                size={18}
                color={
                  discoverLoading
                    ? "#CBD5E1"
                    : "#407BFF"
                }
              />
            </Pressable>
          </View>

          {/* Chargement initial */}

          {discoverLoading &&
          discoverFoods.length === 0 ? (
            <View style={styles.centered}>
              <ActivityIndicator
                size="large"
                color="#407BFF"
              />
            </View>
          ) : discoverFoods.length === 0 ? (
            <EmptyState
              icon="nutrition-outline"
              title="Cherche un aliment"
              subtitle="Tape un nom ou choisis un filtre pour commencer."
            />
          ) : (
            <FlatList
              data={discoverFoods}
              keyExtractor={(item, index) =>
                item.id || String(index)
              }
              contentContainerStyle={
                styles.list
              }
              renderItem={({ item }) => (
                <FoodListItem
                  food={item}
                  onPress={() =>
                    openFoodDetails(item)
                  }
                />
              )}
            />
          )}
        </>
      ) : products.length === 0 ? (
        <EmptyState
          icon="sad-outline"
          title="Aucun résultat"
          subtitle="Essaie un autre nom ou modifie tes filtres."
        />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item, index) =>
            item.id || String(index)
          }
          contentContainerStyle={
            styles.list
          }
          renderItem={({ item }) => (
            <FoodListItem
              food={item}
              onPress={() =>
                openFoodDetails(item)
              }
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

// =========================
// STYLES
// =========================

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F4F7FF",
  },

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
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 2,
  },

  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#1E293B",
    paddingVertical: 10,
  },

  filterBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#EAF1FF",
    alignItems: "center",
    justifyContent: "center",
  },

  filterBtnActive: {
    backgroundColor: "#407BFF",
  },

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

  filterLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 8,
    marginTop: 6,
  },

  chipsRow: {
    marginBottom: 2,
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