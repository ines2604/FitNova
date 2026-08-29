import React, { useCallback, useRef, useState } from "react";
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
import { CameraView, useCameraPermissions, BarcodeScanningResult } from "expo-camera";
import ScreenHeader from "@/components/nutrition/ScreenHeader";
import NutriScoreBadge from "@/components/nutrition/NutriScoreBadge";
import { getProductByBarcode } from "@/services/openFoodFacts.service";
import {
  getScanHistory,
  saveBarcodeScanToHistory,
} from "@/services/scanHistory.service";
import { addMeal } from "@/services/meals.service";
import { MealType, MEAL_TYPE_LABELS } from "@/types/meal";
import { getServerBaseUrl } from "@/services/api";
import { FoodProduct, ScanHistoryEntry } from "@/types/nutrition";

const SCANNED_BARCODE_TYPES = ["ean13", "ean8", "upc_a", "upc_e", "code128", "code39"];

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

export default function NutritionScannerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mealType?: MealType; date?: string }>();
  const mealType = params.mealType as MealType | undefined;
  const targetDate = params.date;
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [product, setProduct] = useState<FoodProduct | null>(null);
  const [addingToTracking, setAddingToTracking] = useState(false);
  const [addedToTracking, setAddedToTracking] = useState(false);
  const lockRef = useRef(false);

  const [history, setHistory] = useState<ScanHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const data = await getScanHistory("barcode");
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

  const handleScanned = async (result: BarcodeScanningResult) => {
    if (lockRef.current) return;
    lockRef.current = true;
    setScanning(false);
    setLoading(true);
    setError("");
    setProduct(null);

    try {
      const found = await getProductByBarcode(result.data);
      if (!found) {
        setError(`Aucun produit trouvé pour ce code-barres (${result.data})`);
      } else {
        setProduct(found);
        // Enregistre l'analyse dans l'historique (best-effort, non bloquant)
        try {
          const entry = await saveBarcodeScanToHistory(found);
          setHistory((prev) => [entry, ...prev]);
        } catch (historyError) {
          console.error("Impossible d'enregistrer l'historique du scan:", historyError);
        }
      }
    } catch (e: any) {
      setError(e?.message || "Erreur lors de la recherche du produit");
    } finally {
      setLoading(false);
    }
  };

  const rescan = () => {
    setProduct(null);
    setError("");
    setScanning(true);
    setAddedToTracking(false);
    lockRef.current = false;
  };

  const handleAddToTracking = async () => {
    if (!product || !mealType || addingToTracking) return;
    setAddingToTracking(true);
    try {
      await addMeal({
        date: targetDate || undefined,
        mealType,
        name: product.name,
        imageUrl: product.imageUrl,
        calories: Math.round(product.caloriesPer100g || 0),
        protein: product.proteinPer100g,
        carbs: product.carbsPer100g,
        fat: product.fatPer100g,
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

  if (!permission) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <ScreenHeader title="Scanner" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#407BFF" />
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <ScreenHeader title="Scanner" />
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={48} color="#94A3B8" />
          <Text style={styles.permissionTitle}>Accès à la caméra requis</Text>
          <Text style={styles.permissionText}>
            Autorise FitNova à utiliser ta caméra pour scanner le code-barres d'un produit.
          </Text>
          <Pressable style={styles.permissionBtn} onPress={requestPermission}>
            <Text style={styles.permissionBtnText}>Autoriser la caméra</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScreenHeader title="Scanner un produit" />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.cameraWrap}>
          {scanning ? (
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: SCANNED_BARCODE_TYPES as any }}
              onBarcodeScanned={handleScanned}
            />
          ) : (
            <View style={[styles.camera, styles.cameraPaused]}>
              {loading ? (
                <ActivityIndicator size="large" color="#fff" />
              ) : (
                <Ionicons name="checkmark-circle" size={48} color="#fff" />
              )}
            </View>
          )}
          <View pointerEvents="none" style={styles.scanFrame} />
        </View>

        <Text style={styles.hint}>
          Cadre le code-barres du produit dans le viseur pour l'analyser.
        </Text>

        {mealType ? (
          <Text style={styles.mealTypeHint}>
            Ajout au repas : {MEAL_TYPE_LABELS[mealType]}
          </Text>
        ) : null}

        {error ? (
          <View style={styles.resultCard}>
            <Ionicons name="alert-circle-outline" size={22} color="#E5493A" />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.rescanBtn} onPress={rescan}>
              <Text style={styles.rescanBtnText}>Scanner à nouveau</Text>
            </Pressable>
          </View>
        ) : null}

        {product ? (
          <View style={styles.resultCard}>
            <View style={styles.resultRow}>
              {product.imageUrl ? (
                <Image source={{ uri: product.imageUrl }} style={styles.resultImage} />
              ) : (
                <View style={[styles.resultImage, styles.resultImagePlaceholder]}>
                  <Ionicons name="fast-food-outline" size={20} color="#94A3B8" />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.resultName} numberOfLines={2}>
                  {product.name}
                </Text>
                <Text style={styles.resultCalories}>
                  {product.caloriesPer100g != null
                    ? `${Math.round(product.caloriesPer100g)} kcal / 100g`
                    : "Calories inconnues"}
                </Text>
              </View>
              <NutriScoreBadge score={product.nutriScore} />
            </View>

            <View style={styles.resultActions}>
              <Pressable style={styles.rescanBtn} onPress={rescan}>
                <Text style={styles.rescanBtnText}>Scanner à nouveau</Text>
              </Pressable>
              <Pressable
                style={styles.detailsBtn}
                onPress={() =>
                  router.push({
                    pathname: "/nutrition-food-details",
                    params: { barcode: product.id },
                  })
                }
              >
                <Text style={styles.detailsBtnText}>Voir les détails</Text>
              </Pressable>
            </View>

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
            <Text style={styles.historyTitle}>Historique des produits scannés</Text>
          </View>

          {historyLoading ? (
            <ActivityIndicator size="small" color="#407BFF" style={{ marginTop: 12 }} />
          ) : history.length === 0 ? (
            <Text style={styles.historyEmptyText}>
              Les produits que tu scannes apparaîtront ici.
            </Text>
          ) : (
            history.map((entry) => {
              const imageUri = resolveImageUri(entry.image_url);
              return (
                <Pressable
                  key={entry.id}
                  style={styles.historyCard}
                  onPress={() =>
                    entry.barcode &&
                    router.push({
                      pathname: "/nutrition-food-details",
                      params: { barcode: entry.barcode },
                    })
                  }
                >
                  {imageUri ? (
                    <Image source={{ uri: imageUri }} style={styles.historyThumb} />
                  ) : (
                    <View style={[styles.historyThumb, styles.historyThumbPlaceholder]}>
                      <Ionicons name="fast-food-outline" size={18} color="#94A3B8" />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyName} numberOfLines={1}>
                      {entry.title}
                    </Text>
                    <Text style={styles.historyDate}>{formatDate(entry.created_at)}</Text>
                  </View>
                  {entry.calories != null ? (
                    <Text style={styles.historyCalories}>
                      {Math.round(entry.calories)} kcal
                    </Text>
                  ) : null}
                  <NutriScoreBadge score={entry.nutri_score} />
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
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  permissionContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  permissionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1E293B",
    marginTop: 14,
  },
  permissionText: {
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 6,
    marginBottom: 20,
  },
  permissionBtn: {
    backgroundColor: "#407BFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  permissionBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  cameraWrap: {
    marginHorizontal: 20,
    height: 280,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
  cameraPaused: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1E293B",
  },
  scanFrame: {
    position: "absolute",
    top: "25%",
    left: "12%",
    right: "12%",
    bottom: "25%",
    borderWidth: 2,
    borderColor: "#fff",
    borderRadius: 16,
  },
  hint: {
    textAlign: "center",
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 32,
  },
  resultCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginTop: 8,
    alignItems: "center",
  },
  errorText: {
    fontSize: 13,
    color: "#475569",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 12,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  resultImage: {
    width: 52,
    height: 52,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: "#F1F5F9",
  },
  resultImagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  resultName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
  },
  resultCalories: {
    fontSize: 13,
    color: "#407BFF",
    fontWeight: "600",
    marginTop: 4,
  },
  resultActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
    width: "100%",
  },
  mealTypeHint: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "700",
    color: "#407BFF",
    textAlign: "center",
  },
  addTrackingBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    width: "100%",
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
  rescanBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
  },
  rescanBtnText: {
    color: "#475569",
    fontWeight: "700",
    fontSize: 13,
  },
  detailsBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: "#407BFF",
  },
  detailsBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  historySection: {
    marginHorizontal: 20,
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
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 10,
    marginBottom: 8,
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
    marginRight: 4,
  },
});
