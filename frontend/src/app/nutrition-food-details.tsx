import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import ScreenHeader from "@/components/nutrition/ScreenHeader";
import NutriScoreBadge from "@/components/nutrition/NutriScoreBadge";
import EmptyState from "@/components/nutrition/EmptyState";
import { getProductByBarcode } from "@/services/openFoodFacts.service";
import { FoodProduct } from "@/types/nutrition";

const NutrientRow = ({ label, value, unit }: { label: string; value: number | null; unit: string }) => (
  <View style={styles.nutrientRow}>
    <Text style={styles.nutrientLabel}>{label}</Text>
    <Text style={styles.nutrientValue}>
      {value != null ? `${value.toFixed(1)} ${unit}` : "—"}
    </Text>
  </View>
);

export default function NutritionFoodDetailsScreen() {
  const { barcode } = useLocalSearchParams<{ barcode: string }>();
  const [product, setProduct] = useState<FoodProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScreenHeader title="Détails de l'aliment" />

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
