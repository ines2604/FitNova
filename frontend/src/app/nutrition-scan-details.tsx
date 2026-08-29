import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import ScreenHeader from "@/components/nutrition/ScreenHeader";
import EmptyState from "@/components/nutrition/EmptyState";
import { getScanHistoryEntry } from "@/services/scanHistory.service";
import { getServerBaseUrl } from "@/services/api";
import { ScanHistoryEntry } from "@/types/nutrition";

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
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function NutritionScanDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [entry, setEntry] = useState<ScanHistoryEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const data = await getScanHistoryEntry(id);
      setEntry(data);
    } catch (e: any) {
      setError(e?.message || "Impossible de charger cette analyse");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const imageUri = entry ? resolveImageUri(entry.image_url) : null;

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScreenHeader title="Détails de l'analyse" />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#407BFF" />
        </View>
      ) : error || !entry ? (
        <EmptyState icon="alert-circle-outline" title={error || "Analyse introuvable"} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]}>
              <Ionicons name="restaurant-outline" size={40} color="#94A3B8" />
            </View>
          )}

          <Text style={styles.title}>{entry.title}</Text>
          <Text style={styles.date}>{formatDate(entry.created_at)}</Text>

          <View style={styles.totalsCard}>
            <View style={styles.totalsRow}>
              <View style={styles.totalBlock}>
                <Text style={styles.totalValue}>
                  {entry.calories != null ? Math.round(entry.calories) : "—"}
                </Text>
                <Text style={styles.totalLabel}>kcal</Text>
              </View>
              <View style={styles.totalBlock}>
                <Text style={styles.totalValue}>
                  {entry.protein != null ? `${Math.round(entry.protein)}g` : "—"}
                </Text>
                <Text style={styles.totalLabel}>Protéines</Text>
              </View>
              <View style={styles.totalBlock}>
                <Text style={styles.totalValue}>
                  {entry.carbs != null ? `${Math.round(entry.carbs)}g` : "—"}
                </Text>
                <Text style={styles.totalLabel}>Glucides</Text>
              </View>
              <View style={styles.totalBlock}>
                <Text style={styles.totalValue}>
                  {entry.fat != null ? `${Math.round(entry.fat)}g` : "—"}
                </Text>
                <Text style={styles.totalLabel}>Lipides</Text>
              </View>
            </View>

            {entry.confidence ? (
              <View
                style={[
                  styles.confidenceBadge,
                  { backgroundColor: CONFIDENCE_COLOR[entry.confidence] || "#94A3B8" },
                ]}
              >
                <Text style={styles.confidenceText}>
                  {CONFIDENCE_LABEL[entry.confidence] || entry.confidence}
                </Text>
              </View>
            ) : null}
          </View>

          {entry.details?.items && entry.details.items.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Aliments détectés</Text>
              {entry.details.items.map((item, index) => (
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
              ))}
            </View>
          ) : null}

          {entry.details?.note ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Note</Text>
              <Text style={styles.paragraph}>{entry.details.note}</Text>
            </View>
          ) : null}

          {entry.scan_type === "photo" ? (
            <Text style={styles.disclaimer}>
              Ces valeurs sont des estimations générées par IA à partir de la photo. Elles
              peuvent varier selon les portions réelles et les ingrédients exacts.
            </Text>
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
  image: {
    width: "100%",
    height: 220,
    borderRadius: 20,
    marginBottom: 14,
    backgroundColor: "#fff",
  },
  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1E293B",
  },
  date: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 4,
    marginBottom: 16,
  },
  totalsCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
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
    marginTop: 14,
  },
  confidenceText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
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
  paragraph: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 21,
  },
  disclaimer: {
    fontSize: 11,
    color: "#CBD5E1",
    textAlign: "center",
    marginTop: 4,
  },
});
