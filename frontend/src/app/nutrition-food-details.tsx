import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Pressable,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import ScreenHeader from "@/components/nutrition/ScreenHeader";
import NutriScoreBadge from "@/components/nutrition/NutriScoreBadge";
import EmptyState from "@/components/nutrition/EmptyState";
import FavoriteButton from "@/components/nutrition/FavoriteButton";
import PortionPicker from "@/components/nutrition/PortionPicker";
import { getProductByBarcode } from "@/services/openFoodFacts.service";
import { addMeal } from "@/services/meals.service";
import { FoodProduct } from "@/types/nutrition";
import { MealType, MEAL_TYPE_LABELS } from "@/types/meal";
import { DEFAULT_PORTION_GRAMS, portionMealName, scaleNutrition } from "@/utils/portion";

const NutrientRow = ({ label, value, unit }: { label: string; value: number | null; unit: string }) => (
  <View style={styles.nutrientRow}>
    <Text style={styles.nutrientLabel}>{label}</Text>
    <Text style={styles.nutrientValue}>
      {value != null ? `${value.toFixed(1)} ${unit}` : "—"}
    </Text>
  </View>
);

export default function NutritionFoodDetailsScreen() {
  const { barcode, mealType, date, source } = useLocalSearchParams<{
    barcode: string;
    mealType?: MealType;
    date?: string;
    /** D'où vient la navigation : "aliment" (recherche d'aliments) ou "barcode" (scan). */
    source?: "aliment" | "barcode";
  }>();
  const [product, setProduct] = useState<FoodProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [addingToTracking, setAddingToTracking] = useState(false);
  const [addedToTracking, setAddedToTracking] = useState(false);
  // Quantité mangée (en grammes) : les valeurs Open Food Facts sont « pour 100 g ».
  const [grams, setGrams] = useState(DEFAULT_PORTION_GRAMS);

  const load = useCallback(async () => {
    if (!barcode) return;
    setLoading(true);
    setError("");
    try {
      const result = await getProductByBarcode(barcode);
      if (!result) {
        setError("Produit introuvable dans Open Food Facts");
      }
      setProduct(result);
    } catch (e: any) {
      setError(e?.message || "Impossible de charger ce produit");
    } finally {
      setLoading(false);
    }
  }, [barcode]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleAddToTracking = async () => {
    if (!product || !mealType || addingToTracking) return;
    setAddingToTracking(true);
    try {
      // Calories et macros de la portion choisie (et non plus de 100 g).
      const portion = scaleNutrition(product, grams);
      await addMeal({
        date: date || undefined,
        mealType,
        name: portionMealName(product.name, grams),
        imageUrl: product.imageUrl,
        calories: portion.calories,
        protein: portion.protein,
        carbs: portion.carbs,
        fat: portion.fat,
        source: "barcode",
        barcode: product.id,
      } as any);
      setAddedToTracking(true);
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Impossible d'ajouter cet aliment");
    } finally {
      setAddingToTracking(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScreenHeader
        title="Détails de l'aliment"
        rightElement={
          product ? (
            <FavoriteButton
              item={{
                itemType: "food",
                refId: product.id,
                name: product.name,
                imageUrl: product.imageUrl,
                calories: product.caloriesPer100g,
                protein: product.proteinPer100g,
                carbs: product.carbsPer100g,
                fat: product.fatPer100g,
                nutriScore: product.nutriScore,
                // On garde la vraie origine (recherche ou scan code-barres)
                // plutôt que de forcer "aliment" pour tous les cas.
                source: source === "barcode" ? "barcode" : "aliment",
              }}
            />
          ) : undefined
        }
      />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#407BFF" />
        </View>
      ) : error || !product ? (
        <EmptyState icon="alert-circle-outline" title={error || "Produit introuvable"} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.imageWrap}>
            {product.imageUrl ? (
              <Image source={{ uri: product.imageUrl }} style={styles.image} />
            ) : (
              <View style={[styles.image, styles.imagePlaceholder]}>
                <Ionicons name="fast-food-outline" size={40} color="#94A3B8" />
              </View>
            )}
          </View>

          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{product.name}</Text>
              {product.brand ? <Text style={styles.brand}>{product.brand}</Text> : null}
              {product.quantity ? (
                <Text style={styles.quantity}>{product.quantity}</Text>
              ) : null}
            </View>
            <NutriScoreBadge score={product.nutriScore} />
          </View>

          <View style={styles.caloriesCard}>
            <Text style={styles.caloriesValue}>
              {product.caloriesPer100g != null ? Math.round(product.caloriesPer100g) : "—"}
            </Text>
            <Text style={styles.caloriesLabel}>kcal / 100g</Text>
          </View>

          {mealType ? (
            <>
              <Text style={styles.mealTypeHint}>
                Ajout au repas : {MEAL_TYPE_LABELS[mealType]}
              </Text>
              <PortionPicker
                product={product}
                grams={grams}
                onChange={setGrams}
                disabled={addingToTracking || addedToTracking}
              />
              <Pressable
                style={[styles.addTrackingBtn, addedToTracking && styles.addTrackingBtnDone]}
                onPress={handleAddToTracking}
                disabled={addingToTracking || addedToTracking}
              >
                {addingToTracking ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons
                      name={addedToTracking ? "checkmark" : "add-circle-outline"}
                      size={18}
                      color="#fff"
                    />
                    <Text style={styles.addTrackingBtnText}>
                      {addedToTracking ? "Ajouté au suivi" : "Ajouter à mon suivi"}
                    </Text>
                  </>
                )}
              </Pressable>
            </>
          ) : null}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Valeurs nutritionnelles (100g)</Text>
            <NutrientRow label="Protéines" value={product.proteinPer100g} unit="g" />
            <NutrientRow label="Glucides" value={product.carbsPer100g} unit="g" />
            <NutrientRow label="dont sucres" value={product.sugarsPer100g} unit="g" />
            <NutrientRow label="Lipides" value={product.fatPer100g} unit="g" />
            <NutrientRow label="Fibres" value={product.fiberPer100g} unit="g" />
            <NutrientRow label="Sel" value={product.saltPer100g} unit="g" />
          </View>

          {product.labels ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Labels</Text>
              <Text style={styles.paragraph}>{product.labels}</Text>
            </View>
          ) : null}

          {product.allergens.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Allergènes</Text>
              <Text style={styles.paragraph}>{product.allergens.join(", ")}</Text>
            </View>
          ) : null}

          {product.ingredientsText ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Ingrédients</Text>
              <Text style={styles.paragraph}>{product.ingredientsText}</Text>
            </View>
          ) : null}

          {product.categories ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Catégories</Text>
              <Text style={styles.paragraph}>{product.categories}</Text>
            </View>
          ) : null}
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
  imageWrap: {
    alignItems: "center",
    marginBottom: 16,
  },
  image: {
    width: 140,
    height: 140,
    borderRadius: 20,
    backgroundColor: "#fff",
  },
  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  name: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1E293B",
  },
  brand: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 2,
  },
  quantity: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 2,
  },
  caloriesCard: {
    backgroundColor: "#407BFF",
    borderRadius: 18,
    paddingVertical: 20,
    alignItems: "center",
    marginBottom: 16,
  },
  caloriesValue: {
    fontSize: 32,
    fontWeight: "800",
    color: "#fff",
  },
  caloriesLabel: {
    fontSize: 13,
    color: "#EAF1FF",
    marginTop: 2,
  },
  mealTypeHint: {
    fontSize: 13,
    fontWeight: "700",
    color: "#407BFF",
    textAlign: "center",
    marginBottom: 8,
  },
  addTrackingBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 16,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: "#407BFF",
  },
  addTrackingBtnDone: {
    backgroundColor: "#1E8F4E",
  },
  addTrackingBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
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
  nutrientRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  nutrientLabel: {
    fontSize: 13,
    color: "#64748B",
  },
  nutrientValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
  },
  paragraph: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 20,
  },
});