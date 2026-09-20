import React, { useCallback, useState } from "react";
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
import EmptyState from "@/components/nutrition/EmptyState";

import { getFavorites, removeFavorite } from "@/services/favorites.service";
import { FavoriteEntry } from "@/types/favorite";
import { formatExerciseName } from "@/utils/exerciseLabels";

export default function WorkoutsFavoritesScreen() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removingId, setRemovingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getFavorites("exercise");
      setFavorites(data);
    } catch (e: any) {
      setError(e?.message || "Impossible de charger tes exercices favoris");
    } finally {
      setLoading(false);
    }
  }, []);

  // Recharge à chaque retour sur l'écran (ex. après avoir retiré un favori
  // depuis la fiche d'un exercice).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleOpen = (item: FavoriteEntry) => {
    if (!item.ref_id) return;
    router.push({
      pathname: "/workouts-exercise-details",
      params: { id: item.ref_id },
    });
  };

  // Retrait direct, sans confirmation.
  const handleRemove = async (item: FavoriteEntry) => {
    if (removingId !== null) return;
    setRemovingId(item.id);
    try {
      await removeFavorite(item.id);
      setFavorites((prev) => prev.filter((f) => f.id !== item.id));
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Impossible de retirer ce favori");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScreenHeader
        title="Exercices favoris"
        subtitle={
          !loading && !error && favorites.length > 0
            ? `${favorites.length} exercice${favorites.length > 1 ? "s" : ""}`
            : undefined
        }
      />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#22C55E" />
        </View>
      ) : error ? (
        <EmptyState icon="alert-circle-outline" title={error} />
      ) : favorites.length === 0 ? (
        <EmptyState
          icon="heart-outline"
          title="Aucun exercice favori"
          subtitle="Appuie sur le cœur d'un exercice, dans la liste ou sur sa fiche, pour le retrouver ici."
        />
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => handleOpen(item)}
              disabled={!item.ref_id}
            >
              {item.image_url ? (
                <Image source={{ uri: item.image_url }} style={styles.image} />
              ) : (
                <View style={[styles.image, styles.imagePlaceholder]}>
                  <Ionicons name="barbell-outline" size={22} color="#94A3B8" />
                </View>
              )}

              <View style={styles.info}>
                <Text style={styles.name} numberOfLines={2}>
                  {formatExerciseName(item.name)}
                </Text>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>Exercice</Text>
                </View>
              </View>

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
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F4F7FF" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
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
  imagePlaceholder: { alignItems: "center", justifyContent: "center" },
  info: { flex: 1, marginRight: 8 },
  name: { fontSize: 15, fontWeight: "700", color: "#1E293B" },
  tag: {
    alignSelf: "flex-start",
    backgroundColor: "#E9FBF0",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 6,
  },
  tagText: { fontSize: 11, fontWeight: "600", color: "#22C55E" },
  removeBtn: {
    marginLeft: 8,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
});