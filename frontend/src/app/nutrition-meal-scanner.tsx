import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Image,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import ScreenHeader from "@/components/nutrition/ScreenHeader";
import { scanMealPhoto } from "@/services/mealScanner.service";
import { getScanHistory } from "@/services/scanHistory.service";
import { addMeal } from "@/services/meals.service";
import { MealType, MEAL_TYPE_LABELS } from "@/types/meal";
import { getServerBaseUrl } from "@/services/api";
import { MealScanResult, ScanHistoryEntry } from "@/types/nutrition";

const CONFIDENCE_LABEL: Record<string, string> = {
  low: "Faible confiance",
  medium: "Confiance moyenne",
  high: "Confiance élevée",
};

const CONFIDENCE_COLOR: Record<string, string> = {
  low: "#E5493A",
  medium: "#F08A24",
  high: "#1E8F4E",
};

const resolveImageUri = (imageUrl: string | null): string | null => {
  if (!imageUrl) return null;
  if (imageUrl.startsWith("http")) return imageUrl;
  return `${getServerBaseUrl()}${imageUrl}`;
};

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function NutritionMealScannerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mealType?: MealType; date?: string }>();
  const mealType = params.mealType as MealType | undefined;
  const targetDate = params.date;
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<MealScanResult | null>(null);
  const [addingToTracking, setAddingToTracking] = useState(false);
  const [addedToTracking, setAddedToTracking] = useState(false);

  const [history, setHistory] = useState<ScanHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const data = await getScanHistory("photo");
      setHistory(data);
    } catch (e) {
      // Historique non bloquant : on échoue silencieusement ici.
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  const reset = () => {
    setPreviewUri(null);
    setResult(null);
    setError("");
    setAddedToTracking(false);
  };

  const handleAddToTracking = async () => {
    if (!result || !mealType || addingToTracking) return;
    setAddingToTracking(true);
    try {
      await addMeal({
        date: targetDate || undefined,
        mealType,
        name:
          result.items.length > 0
            ? result.items.map((i) => i.name).join(", ")
            : "Repas scanné",
        imageUrl: result.photoUrl,
        calories: Math.round(result.totalCalories || 0),
        protein: result.totalProtein,
        carbs: result.totalCarbs,
        fat: result.totalFat,
        source: "photo",
      } as any);
      setAddedToTracking(true);
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Impossible d'ajouter ce repas");
    } finally {
      setAddingToTracking(false);
    }
  };

  const analyze = async (uri: string) => {
    setPreviewUri(uri);
    setResult(null);
    setError("");
    setLoading(true);
    try {
      const data = await scanMealPhoto(uri);
      setResult(data);
      // L'analyse est déjà enregistrée côté backend : on rafraîchit la liste.
      loadHistory();
    } catch (e: any) {
      setError(e?.message || "Erreur lors de l'analyse de la photo");
    } finally {
      setLoading(false);
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission refusée",
        "Autorise l'accès à la caméra pour photographier ton repas."
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.7,
    });

    if (result.canceled || !result.assets[0]?.uri) return;
    await analyze(result.assets[0].uri);
  };

  const pickFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission refusée",
        "Autorise l'accès à la galerie pour choisir une photo de ton repas."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
    });

    if (result.canceled || !result.assets[0]?.uri) return;
    await analyze(result.assets[0].uri);
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScreenHeader title="Scanner un repas" />

      <ScrollView contentContainerStyle={styles.content}>
        {mealType ? (
          <Text style={styles.mealTypeHint}>
            Ajout au repas : {MEAL_TYPE_LABELS[mealType]}
          </Text>
        ) : null}

        {previewUri ? (
          <Image source={{ uri: previewUri }} style={styles.preview} />
        ) : (
          <View style={styles.emptyPreview}>
            <Ionicons name="restaurant-outline" size={40} color="#94A3B8" />
            <Text style={styles.emptyPreviewText}>
              Prends une photo de ton assiette pour estimer ses calories et ses macros.
            </Text>
          </View>
        )}

        {!previewUri ? (
          <View style={styles.actionsRow}>
            <Pressable style={styles.primaryBtn} onPress={takePhoto}>
              <Ionicons name="camera" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>Prendre une photo</Text>
            </Pressable>
            <Pressable style={styles.secondaryBtn} onPress={pickFromLibrary}>
              <Ionicons name="images-outline" size={18} color="#407BFF" />
              <Text style={styles.secondaryBtnText}>Galerie</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.secondaryBtn} onPress={reset}>
            <Ionicons name="refresh" size={18} color="#407BFF" />
            <Text style={styles.secondaryBtnText}>Nouvelle photo</Text>
          </Pressable>
        )}

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#407BFF" />
            <Text style={styles.loadingText}>Analyse du repas en cours…</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.resultCard}>
            <Ionicons name="alert-circle-outline" size={22} color="#E5493A" />
            <Text style={styles.errorText}>{error}</Text>
            {previewUri ? (
              <Pressable style={styles.primaryBtn} onPress={() => analyze(previewUri)}>
                <Text style={styles.primaryBtnText}>Réessayer</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {result ? (
          <View style={styles.resultCard}>
            <View style={styles.totalsRow}>
              <View style={styles.totalBlock}>
                <Text style={styles.totalValue}>{Math.round(result.totalCalories)}</Text>
                <Text style={styles.totalLabel}>kcal</Text>
              </View>
              <View style={styles.totalBlock}>
                <Text style={styles.totalValue}>{Math.round(result.totalProtein)}g</Text>
                <Text style={styles.totalLabel}>Protéines</Text>
              </View>
              <View style={styles.totalBlock}>
                <Text style={styles.totalValue}>{Math.round(result.totalCarbs)}g</Text>
                <Text style={styles.totalLabel}>Glucides</Text>
              </View>
              <View style={styles.totalBlock}>
                <Text style={styles.totalValue}>{Math.round(result.totalFat)}g</Text>
                <Text style={styles.totalLabel}>Lipides</Text>
              </View>
            </View>

            <View
              style={[
                styles.confidenceBadge,
                { backgroundColor: CONFIDENCE_COLOR[result.confidence] || "#94A3B8" },
              ]}
            >
              <Text style={styles.confidenceText}>
                {CONFIDENCE_LABEL[result.confidence] || "Confiance moyenne"}
              </Text>
            </View>

            {result.items.length === 0 ? (
              <Text style={styles.emptyItemsText}>
                Aucun aliment n'a pu être identifié sur cette photo.
              </Text>
            ) : (
              result.items.map((item, index) => (
                <View key={`${item.name}-${index}`} style={styles.itemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    {item.quantity ? (
                      <Text style={styles.itemQuantity}>{item.quantity}</Text>
                    ) : null}
                  </View>
                  <View style={styles.itemMacros}>
                    <Text style={styles.itemCalories}>{Math.round(item.calories)} kcal</Text>
                    <Text style={styles.itemMacroText}>
                      P {Math.round(item.protein)}g · G {Math.round(item.carbs)}g · L{" "}
                      {Math.round(item.fat)}g
                    </Text>
                  </View>
                </View>
              ))
            )}

            {result.note ? <Text style={styles.noteText}>{result.note}</Text> : null}

            <Text style={styles.disclaimer}>
              Ces valeurs sont des estimations générées par IA à partir de la photo. Elles peuvent
              varier selon les portions réelles et les ingrédients exacts.
            </Text>

            {mealType ? (
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
            ) : null}
          </View>
        ) : null}

        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <Ionicons name="time-outline" size={16} color="#1E293B" />
            <Text style={styles.historyTitle}>Historique des repas analysés</Text>
          </View>

          {historyLoading ? (
            <ActivityIndicator size="small" color="#407BFF" style={{ marginTop: 12 }} />
          ) : history.length === 0 ? (
            <Text style={styles.historyEmptyText}>
              Les repas que tu analyses par photo apparaîtront ici.
            </Text>
          ) : (
            history.map((entry) => {
              const imageUri = resolveImageUri(entry.image_url);
              return (
                <Pressable
                  key={entry.id}
                  style={styles.historyCard}
                  onPress={() =>
                    router.push({
                      pathname: "/nutrition-scan-details",
                      params: { id: entry.id },
                    })
                  }
                >
                  <View style={styles.historyCardRow}>
                    {imageUri ? (
                      <Image source={{ uri: imageUri }} style={styles.historyThumb} />
                    ) : (
                      <View style={[styles.historyThumb, styles.historyThumbPlaceholder]}>
                        <Ionicons name="restaurant-outline" size={18} color="#94A3B8" />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyName} numberOfLines={2}>
                        {entry.title}
                      </Text>
                      <Text style={styles.historyDate}>{formatDate(entry.created_at)}</Text>
                    </View>
                    {entry.calories != null ? (
                      <Text style={styles.historyCalories}>
                        {Math.round(entry.calories)} kcal
                      </Text>
                    ) : null}
                  </View>
                  {entry.details?.items?.length ? (
                    <Text style={styles.historyItemsPreview} numberOfLines={1}>
                      {entry.details.items.map((it) => it.name).join(" · ")}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F4F7FF",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  preview: {
    width: "100%",
    height: 240,
    borderRadius: 18,
    backgroundColor: "#E2E8F0",
    marginBottom: 14,
  },
  emptyPreview: {
    width: "100%",
    height: 200,
    borderRadius: 18,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
  },
  emptyPreviewText: {
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 10,
  },
  mealTypeHint: {
    fontSize: 13,
    fontWeight: "700",
    color: "#407BFF",
    textAlign: "center",
    marginBottom: 12,
  },
  addTrackingBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
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
  actionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#407BFF",
    paddingVertical: 13,
    borderRadius: 14,
  },
  primaryBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#EAF0FF",
    paddingVertical: 13,
    borderRadius: 14,
  },
  secondaryBtnText: {
    color: "#407BFF",
    fontWeight: "700",
    fontSize: 14,
  },
  loadingBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  loadingText: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 10,
  },
  resultCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    marginTop: 16,
  },
  errorText: {
    fontSize: 13,
    color: "#475569",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 14,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  totalBlock: {
    alignItems: "center",
    flex: 1,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1E293B",
  },
  totalLabel: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
  },
  confidenceBadge: {
    alignSelf: "center",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 14,
  },
  confidenceText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  emptyItemsText: {
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
    paddingVertical: 10,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  itemName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
  },
  itemQuantity: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 2,
  },
  itemMacros: {
    alignItems: "flex-end",
  },
  itemCalories: {
    fontSize: 13,
    fontWeight: "700",
    color: "#407BFF",
  },
  itemMacroText: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
  },
  noteText: {
    fontSize: 12,
    color: "#64748B",
    fontStyle: "italic",
    marginTop: 12,
  },
  disclaimer: {
    fontSize: 11,
    color: "#CBD5E1",
    textAlign: "center",
    marginTop: 14,
  },
  historySection: {
    marginTop: 24,
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1E293B",
  },
  historyEmptyText: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
    paddingVertical: 16,
  },
  historyCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 10,
    marginBottom: 8,
  },
  historyCardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  historyThumb: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
  },
  historyThumbPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  historyName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
  },
  historyDate: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
  },
  historyCalories: {
    fontSize: 12,
    fontWeight: "700",
    color: "#407BFF",
  },
  historyItemsPreview: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 6,
    fontStyle: "italic",
  },
});
