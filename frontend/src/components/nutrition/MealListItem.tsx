import React from "react";
import { View, Text, StyleSheet, Pressable, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MealSummary } from "@/types/nutrition";

type Props = {
  meal: MealSummary;
  onPress: () => void;
};

export default function MealListItem({ meal, onPress }: Props) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      {meal.thumbnail ? (
        <Image source={{ uri: meal.thumbnail }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Ionicons name="restaurant-outline" size={22} color="#94A3B8" />
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>
          {meal.name}
        </Text>
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
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 10,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  image: {
    width: 64,
    height: 64,
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
    marginRight: 6,
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 6,
    gap: 6,
  },
  tag: {
    backgroundColor: "#EAF1FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#407BFF",
  },
});
