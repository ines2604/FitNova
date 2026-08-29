import React from "react";
import { View, Text, StyleSheet, Pressable, Image, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants/colors";
import { getUploadUrl } from "@/utils/media";
import { MealEntry, MealType, MEAL_TYPE_ICONS, MEAL_TYPE_LABELS } from "@/types/meal";

type Props = {
  mealType: MealType;
  meals: MealEntry[];
  onAdd: (mealType: MealType) => void;
  onDelete: (meal: MealEntry) => void;
};

export default function MealSection({ mealType, meals, onAdd, onDelete }: Props) {
  const totalCalories = meals.reduce((sum, m) => sum + (m.calories || 0), 0);

  const confirmDelete = (meal: MealEntry) => {
    Alert.alert("Supprimer", `Retirer "${meal.name}" de ton suivi ?`, [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: () => onDelete(meal) },
    ]);
  };

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconBubble}>
            <Ionicons
              name={MEAL_TYPE_ICONS[mealType] as any}
              size={16}
              color={COLORS.primary}
            />
          </View>
          <Text style={styles.title}>{MEAL_TYPE_LABELS[mealType]}</Text>
        </View>

        <View style={styles.headerRight}>
          {totalCalories > 0 ? (
            <Text style={styles.totalText}>{Math.round(totalCalories)} Cal</Text>
          ) : null}
          <Pressable style={styles.addBtn} onPress={() => onAdd(mealType)}>
            <Ionicons name="add" size={18} color={COLORS.primary} />
          </Pressable>
        </View>
      </View>

      {meals.length === 0 ? (
        <Pressable style={styles.emptyRow} onPress={() => onAdd(mealType)}>
          <Text style={styles.emptyText}>
            Ajouter ton {MEAL_TYPE_LABELS[mealType].toLowerCase()}
          </Text>
        </Pressable>
      ) : (
        meals.map((meal) => {
          const imageUri = getUploadUrl(meal.image_url);
          return (
            <Pressable
              key={meal.id}
              style={styles.itemRow}
              onLongPress={() => confirmDelete(meal)}
            >
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.itemImage} />
              ) : (
                <View style={[styles.itemImage, styles.itemImagePlaceholder]}>
                  <Ionicons name="fast-food-outline" size={18} color={COLORS.textFaint} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {meal.name}
                </Text>
                <Text style={styles.itemCalories}>{Math.round(meal.calories)} Cal</Text>
              </View>
              <Pressable hitSlop={10} onPress={() => confirmDelete(meal)}>
                <Ionicons name="close" size={18} color={COLORS.textFaint} />
              </Pressable>
            </Pressable>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 14,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  totalText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textFaint,
  },
  addBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyRow: {
    marginTop: 12,
    paddingVertical: 6,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textFaint,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 12,
  },
  itemImage: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  itemImagePlaceholder: {
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  itemName: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  itemCalories: {
    fontSize: 12,
    color: COLORS.textFaint,
    fontWeight: "600",
    marginTop: 2,
  },
});
