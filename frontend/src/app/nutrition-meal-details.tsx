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
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import ScreenHeader from "@/components/nutrition/ScreenHeader";
import EmptyState from "@/components/nutrition/EmptyState";
import FavoriteButton from "@/components/nutrition/FavoriteButton";
import { getMealById } from "@/services/theMealDb.service";
import { MealDetail } from "@/types/nutrition";
import { addMeal } from "@/services/meals.service";
import { MealType, MEAL_TYPE_LABELS } from "@/types/meal";

export default function NutritionMealDetailsScreen() {
  const { id, mealType, date } = useLocalSearchParams<{
    id: string;
    mealType?: MealType;
    date?: string;
  }>();
  const [meal, setMeal] = useState<MealDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showAddForm, setShowAddForm] = useState(false);
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [addingToTracking, setAddingToTracking] = useState(false);
  const [addedToTracking, setAddedToTracking] = useState(false);

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

  const handleAddToTracking = async () => {
    if (!meal || !mealType || addingToTracking) return;
    const caloriesValue = parseInt(calories, 10);
    if (!caloriesValue || caloriesValue <= 0) {
      Alert.alert("Champ manquant", "Indique le nombre de calories de la portion.");
      return;
    }
    setAddingToTracking(true);
    try {
      await addMeal({
        date: date || undefined,
        mealType,
        name: meal.name,
        imageUrl: meal.thumbnail,
        calories: caloriesValue,
        protein: protein ? parseFloat(protein) : null,
        carbs: carbs ? parseFloat(carbs) : null,
        fat: fat ? parseFloat(fat) : null,
        source: "manual",
      } as any);
      setAddedToTracking(true);
      setShowAddForm(false);
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Impossible d'ajouter ce repas");
    } finally {
      setAddingToTracking(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScreenHeader
        title="Détails du repas"
        rightElement={
          meal ? (
            <FavoriteButton
              item={{
                itemType: "recipe",
                refId: meal.id,
                name: meal.name,
                imageUrl: meal.thumbnail,
                source: "repas",
              }}
            />
          ) : undefined
        }
      />

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

          {mealType ? (
            <View style={styles.addSection}>
              <Text style={styles.mealTypeHint}>
                Ajout au repas : {MEAL_TYPE_LABELS[mealType]}
              </Text>

              {!showAddForm && !addedToTracking ? (
                <Pressable
                  style={styles.addTrackingBtn}
                  onPress={() => setShowAddForm(true)}
                >
                  <Ionicons name="add-circle-outline" size={18} color="#fff" />
                  <Text style={styles.addTrackingBtnText}>Ajouter à mon suivi</Text>
                </Pressable>
              ) : null}

              {addedToTracking ? (
                <View style={[styles.addTrackingBtn, styles.addTrackingBtnDone]}>
                  <Ionicons name="checkmark" size={18} color="#fff" />
                  <Text style={styles.addTrackingBtnText}>Ajouté au suivi</Text>
                </View>
              ) : null}

              {showAddForm ? (
                <View style={styles.addForm}>
                  <Text style={styles.addFormHint}>
                    TheMealDB ne fournit pas les calories : indique celles de ta portion.
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Calories (kcal)"
                    placeholderTextColor="#94A3B8"
                    keyboardType="number-pad"
                    value={calories}
                    onChangeText={(t) => setCalories(t.replace(/[^0-9]/g, ""))}
                  />
                  <View style={styles.macroRow}>
                    <TextInput
                      style={[styles.input, styles.macroInput]}
                      placeholder="Protéines g"
                      placeholderTextColor="#94A3B8"
                      keyboardType="decimal-pad"
                      value={protein}
                      onChangeText={setProtein}
                    />
                    <TextInput
                      style={[styles.input, styles.macroInput]}
                      placeholder="Glucides g"
                      placeholderTextColor="#94A3B8"
                      keyboardType="decimal-pad"
                      value={carbs}
                      onChangeText={setCarbs}
                    />
                    <TextInput
                      style={[styles.input, styles.macroInput]}
                      placeholder="Lipides g"
                      placeholderTextColor="#94A3B8"
                      keyboardType="decimal-pad"
                      value={fat}
                      onChangeText={setFat}
                    />
                  </View>
                  <View style={styles.addFormActions}>
                    <Pressable
                      style={styles.cancelBtn}
                      onPress={() => setShowAddForm(false)}
                    >
                      <Text style={styles.cancelBtnText}>Annuler</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.saveBtn, addingToTracking && styles.saveBtnDisabled]}
                      onPress={handleAddToTracking}
                      disabled={addingToTracking}
                    >
                      {addingToTracking ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.saveBtnText}>Confirmer</Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              ) : null}
            </View>
          ) : null}

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
  addSection: {
    marginBottom: 16,
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
  addForm: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginTop: 10,
    gap: 10,
  },
  addFormHint: {
    fontSize: 12,
    color: "#94A3B8",
  },
  input: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#1E293B",
  },
  macroRow: {
    flexDirection: "row",
    gap: 10,
  },
  macroInput: {
    flex: 1,
  },
  addFormActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 2,
  },
  cancelBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
  },
  cancelBtnText: {
    color: "#475569",
    fontWeight: "700",
    fontSize: 14,
  },
  saveBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: "#407BFF",
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
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