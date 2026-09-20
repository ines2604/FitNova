import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import ScreenHeader from "@/components/nutrition/ScreenHeader";
import Chip from "@/components/nutrition/Chip";
import EmptyState from "@/components/nutrition/EmptyState";
import NutriScoreBadge from "@/components/nutrition/NutriScoreBadge";
import { getFavorites, removeFavorite } from "@/services/favorites.service";
import { getServerBaseUrl } from "@/services/api";
import { FavoriteEntry, FavoriteItemType } from "@/types/favorite";

const FILTERS: { value: FavoriteItemType | "all"; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "food", label: "Aliments" },
  { value: "recipe", label: "Repas" },
];

const SOURCE_LABEL: Record<string, string> = {
  aliment: "Aliment",
  barcode: "Code barre",
  photo: "Photo",
  repas: "Repas",
};

const resolveImageUri = (imageUrl: string | null): string | null => {
  if (!imageUrl) return null;
  if (imageUrl.startsWith("http")) return imageUrl;
  return `${getServerBaseUrl()}${imageUrl}`;
};

// Classement des favoris pour le filtrage :
// - "Repas"    : les recettes (TheMealDB) ET les repas analysés par photo
// - "Aliments" : les aliments de recherche et de code-barres
//
// Un favori photo est reconnu de trois façons, car les anciens favoris
// (créés avant le correctif du champ `source`) ont pu être enregistrés avec
// source = "aliment" :
//   1. source === "photo"
//   2. ref_id de la forme "scan:<id>" (référence vers l'historique des scans)
//   3. image envoyée depuis l'app et stockée sur le serveur ("/uploads/...")
//      alors que les images d'aliments (Open Food Facts) sont en "http..."
const isPhotoFavorite = (f: FavoriteEntry): boolean =>
  f.source === "photo" ||
  !!f.ref_id?.startsWith("scan:") ||
  (f.item_type === "food" && !!f.image_url && f.image_url.startsWith("/uploads/"));

const isMealFavorite = (f: FavoriteEntry): boolean =>
  f.item_type === "recipe" || isPhotoFavorite(f);

const isFoodFavorite = (f: FavoriteEntry): boolean =>
  f.item_type === "food" && !isPhotoFavorite(f);

export default function NutritionFavoritesScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<FavoriteItemType | "all">("all");
  const [allFavorites, setAllFavorites] = useState<FavoriteEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removingId, setRemovingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // On charge tous les favoris une seule fois : le filtrage (Tous /
      // Aliments / Repas) est fait côté client, ce qui permet de ranger les
      // photos avec les repas sans dépendre de l'item_type stocké en base.
      const data = await getFavorites();
      // Les exercices favoris ont leur propre écran (workouts-favorites) :
      // on les écarte de la section nutrition.
      setAllFavorites(data.filter((f) => f.item_type !== "exercise"));
    } catch (e: any) {
      setError(e?.message || "Impossible de charger tes favoris");
    } finally {
      setLoading(false);
    }
  }, []);

  const favorites = useMemo(() => {
    if (filter === "recipe") return allFavorites.filter(isMealFavorite);
    if (filter === "food") return allFavorites.filter(isFoodFavorite);
    return allFavorites;
  }, [allFavorites, filter]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleOpen = (item: FavoriteEntry) => {
    if (item.ref_id?.startsWith("scan:")) {
      // Favori issu d'une analyse par photo : on rouvre la fiche de l'analyse
      // correspondante dans l'historique des scans.
      router.push({
        pathname: "/nutrition-scan-details",
        params: { id: item.ref_id.replace("scan:", "") },
      });
    } else if (item.item_type === "food" && item.ref_id) {
      router.push({
        pathname: "/nutrition-food-details",
        // On transmet la source d'origine pour que le bouton favoris de la
        // fiche détail retombe sur la bonne valeur (aliment/barcode) si
        // l'utilisateur le retire puis le ré-ajoute depuis cet écran.
        params: { barcode: item.ref_id, source: item.source === "barcode" ? "barcode" : "aliment" },
      });
    } else if (item.item_type === "recipe" && item.ref_id) {
      router.push({
        pathname: "/nutrition-meal-details",
        params: { id: item.ref_id },
      });
    }
    // Les anciens favoris issus d'une photo sans référence (avant ce correctif)
    // n'ont pas de fiche dédiée : leurs infos restent visibles sur la carte.
  };

  // Retrait direct, sans confirmation.
  const handleRemove = async (item: FavoriteEntry) => {
    if (removingId !== null) return;
    setRemovingId(item.id);
    try {
      await removeFavorite(item.id);
      setAllFavorites((prev) => prev.filter((f) => f.id !== item.id));
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Impossible de retirer ce favori");
    } finally {
      setRemovingId(null);
    }
  };

  const isNavigable = (item: FavoriteEntry) => !!item.ref_id;

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScreenHeader title="Mes favoris" />

      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <Chip
            key={f.value}
            label={f.label}
            active={filter === f.value}
            onPress={() => setFilter(f.value)}
          />
        ))}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#407BFF" />
        </View>
      ) : error ? (
        <EmptyState icon="alert-circle-outline" title={error} />
      ) : favorites.length === 0 ? (
        <EmptyState
          icon="heart-outline"
          title="Aucun favori pour l'instant"
          subtitle="Ajoute des aliments ou des repas en appuyant sur le cœur depuis leur fiche, le scanner ou une recherche."
        />
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const imageUri = resolveImageUri(item.image_url);
            const navigable = isNavigable(item);
            return (
              <Pressable
                style={styles.card}
                onPress={() => handleOpen(item)}
                disabled={!navigable}
              >
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={styles.image} />
                ) : (
                  <View style={[styles.image, styles.imagePlaceholder]}>
                    <Ionicons
                      name={isMealFavorite(item) ? "restaurant-outline" : "fast-food-outline"}
                      size={22}
                      color="#94A3B8"
                    />
                  </View>
                )}

                <View style={styles.info}>
                  <Text style={styles.name} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <View style={styles.metaRow}>
                    <View style={styles.sourceTag}>
                      <Text style={styles.sourceTagText}>
                        {isPhotoFavorite(item) ? SOURCE_LABEL.photo : SOURCE_LABEL[item.source] || item.source}
                      </Text>
                    </View>
                    {item.calories != null ? (
                      <Text style={styles.calories}>
                        {Math.round(item.calories)} kcal
                      </Text>
                    ) : null}
                  </View>
                  {item.protein != null || item.carbs != null || item.fat != null ? (
                    <Text style={styles.macros}>
                      P {item.protein != null ? Math.round(item.protein) : "—"}g · G{" "}
                      {item.carbs != null ? Math.round(item.carbs) : "—"}g · L{" "}
                      {item.fat != null ? Math.round(item.fat) : "—"}g
                    </Text>
                  ) : null}
                </View>

                {isFoodFavorite(item) ? (
                  <NutriScoreBadge score={item.nutri_score} />
                ) : null}

                <Pressable
                  style={styles.removeBtn}
                  onPress={() => handleRemove(item)}
                  disabled={removingId === item.id}
                  hitSlop={8}
                >
                  {removingId === item.id ? (
                    <ActivityIndicator size="small" color="#EF4444" />
                  ) : (
                    <Ionicons name="heart" size={20} color="#EF4444" />
                  )}
                </Pressable>
              </Pressable>
            );
          }}
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
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  filters: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
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
  image: {
    width: 56,
    height: 56,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: "#F1F5F9",
  },
  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
    marginRight: 8,
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 8,
  },
  sourceTag: {
    backgroundColor: "#EAF1FF",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  sourceTagText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#407BFF",
  },
  calories: {
    fontSize: 13,
    color: "#407BFF",
    fontWeight: "600",
  },
  macros: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 3,
  },
  removeBtn: {
    marginLeft: 8,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
});