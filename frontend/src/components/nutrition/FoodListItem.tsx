import React from "react";
import { View, Text, StyleSheet, Pressable, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FoodProduct } from "@/types/nutrition";
import NutriScoreBadge from "./NutriScoreBadge";
import FavoriteButton from "./FavoriteButton";

type Props = {
  food: FoodProduct;
  onPress: () => void;
  /** Affiche un cœur permettant d'ajouter directement l'aliment aux favoris. */
  showFavorite?: boolean;
};

export default function FoodListItem({ food, onPress, showFavorite }: Props) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      {food.imageUrl ? (
        <Image source={{ uri: food.imageUrl }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Ionicons name="fast-food-outline" size={22} color="#94A3B8" />
        </View>
      )}

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {food.name}
        </Text>
        {food.brand ? (
          <Text style={styles.brand} numberOfLines={1}>
            {food.brand}
          </Text>
        ) : null}
        <Text style={styles.calories}>
          {food.caloriesPer100g != null
            ? `${Math.round(food.caloriesPer100g)} kcal / 100g`
            : "Calories inconnues"}
        </Text>
      </View>

      <NutriScoreBadge score={food.nutriScore} />

      {showFavorite ? (
        <FavoriteButton
          style={styles.favoriteBtn}
          size={20}
          item={{
            itemType: "food",
            refId: food.id,
            name: food.name,
            imageUrl: food.imageUrl,
            calories: food.caloriesPer100g,
            protein: food.proteinPer100g,
            carbs: food.carbsPer100g,
            fat: food.fatPer100g,
            nutriScore: food.nutriScore,
            source: "aliment",
          }}
        />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
    width: 52,
    height: 52,
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
  brand: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 2,
  },
  calories: {
    fontSize: 13,
    color: "#407BFF",
    fontWeight: "600",
    marginTop: 4,
  },
  favoriteBtn: {
    marginLeft: 8,
  },
});