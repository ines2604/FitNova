import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Pressable,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import ScreenHeader from "@/components/nutrition/ScreenHeader";
import EmptyState from "@/components/nutrition/EmptyState";
import { getMealById } from "@/services/theMealDb.service";
import { MealDetail } from "@/types/nutrition";

export default function NutritionMealDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [meal, setMeal] = useState<MealDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const result = await getMealById(id);
      if (!result) setError("Repas introuvable");
      setMeal(result);
    } catch (e: any) {
      setError(e?.message || "Impossible de charger ce repas");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScreenHeader title="Détails du repas" />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#407BFF" />
        </View>
      ) : error || !meal ? (
        <EmptyState icon="alert-circle-outline" title={error || "Repas introuvable"} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {meal.thumbnail ? (
            <Image source={{ uri: meal.thumbnail }} style={styles.image} />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]}>
              <Ionicons name="restaurant-outline" size={40} color="#94A3B8" />
            </View>
          )}

          <Text style={styles.name}>{meal.name}</Text>

          <View style={styles.tags}>
            {meal.category ? (
              <View style={styles.tag}>
                <Text style={styles.tagText}>{meal.category}</Text>
              </View>
            ) : null}
            {meal.area ? (
              <View style={styles.tag}>
                <Text style={styles.tagText}>{meal.area}</Text>
              </View>
            ) : null}
            {meal.tags.map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>

          {meal.ingredients.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Ingrédients</Text>
              {meal.ingredients.map((item, index) => (
                <View key={`${item.ingredient}-${index}`} style={styles.ingredientRow}>
                  <View style={styles.dot} />
                  <Text style={styles.ingredientText}>
                    <Text style={{ fontWeight: "700" }}>{item.ingredient}</Text>
                    {item.measure ? `  —  ${item.measure}` : ""}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {meal.instructions ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Préparation</Text>
              <Text style={styles.paragraph}>{meal.instructions}</Text>
            </View>
          ) : null}

          <View style={styles.linksRow}>
            {meal.youtubeUrl ? (
              <Pressable
                style={[styles.linkBtn, { backgroundColor: "#E5493A" }]}
                onPress={() => Linking.openURL(meal.youtubeUrl!)}
              >
                <Ionicons name="logo-youtube" size={16} color="#fff" />
                <Text style={styles.linkBtnText}>Vidéo</Text>
              </Pressable>
            ) : null}
            {meal.sourceUrl ? (
              <Pressable
                style={[styles.linkBtn, { backgroundColor: "#407BFF" }]}
                onPress={() => Linking.openURL(meal.sourceUrl!)}
              >
                <Ionicons name="link" size={16} color="#fff" />
                <Text style={styles.linkBtnText}>Source</Text>
              </Pressable>
            ) : null}
          </View>
        </ScrollView>
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
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  image: {
    width: "100%",
    height: 200,
    borderRadius: 20,
    marginBottom: 14,
    backgroundColor: "#fff",
  },
  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 10,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 16,
    gap: 6,
  },
  tag: {
    backgroundColor: "#EAF1FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginRight: 6,
    marginBottom: 6,
  },
  tagText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#407BFF",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 10,
  },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#407BFF",
    marginRight: 10,
  },
  ingredientText: {
    fontSize: 13,
    color: "#475569",
    flex: 1,
  },
  paragraph: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 21,
  },
  linksRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  linkBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  linkBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
});
