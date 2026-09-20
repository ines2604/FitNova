import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
  Alert,
  TextInput,
  Platform,
  Modal,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import ScreenHeader from "@/components/nutrition/ScreenHeader";
import EmptyState from "@/components/nutrition/EmptyState";
import {
  addProgressPhoto,
  deleteProgressPhoto,
  getProgressPhotos,
} from "@/services/progressPhoto.service";
import { getProfile } from "@/services/profile.service";
import { ProgressPhotoEntry } from "@/types/progressPhoto";
import { getUploadUrl } from "@/utils/media";
import { formatDate, formatDisplayDate } from "@/utils/formatters";

export default function ProgressPhotosScreen() {
  const [history, setHistory] = useState<ProgressPhotoEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState("");

  const [pendingUri, setPendingUri] = useState<string | null>(null);
  const [weightInput, setWeightInput] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewerUri, setViewerUri] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const data = await getProgressPhotos();
      setHistory(data);
      setError("");
    } catch (e: any) {
      setError(e?.message || "Impossible de charger l'historique des photos");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  // Préremplit le poids avec le dernier poids enregistré dans le profil,
  // pour éviter à l'utilisateur de le ressaisir à chaque photo.
  const prefillWeight = async () => {
    try {
      const profile = await getProfile();
      if (profile?.weight_kg) {
        setWeightInput(String(profile.weight_kg));
      }
    } catch {
      // Non bloquant : l'utilisateur peut saisir le poids manuellement.
    }
  };

  const startNewPhoto = async (uri: string) => {
    setPendingUri(uri);
    setSelectedDate(new Date());
    await prefillWeight();
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission refusée",
        "Autorise l'accès à la caméra pour prendre une photo de progression."
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]?.uri) return;
    await startNewPhoto(result.assets[0].uri);
  };

  const pickFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission refusée",
        "Autorise l'accès à la galerie pour importer une photo de progression."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]?.uri) return;
    await startNewPhoto(result.assets[0].uri);
  };

  const cancelPending = () => {
    setPendingUri(null);
    setWeightInput("");
    setSelectedDate(new Date());
  };

  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === "android") setShowDatePicker(false);
    if (event.type === "dismissed" || !date) return;
    setSelectedDate(date);
  };

  const handleSave = async () => {
    if (!pendingUri || saving) return;
    const weightValue = weightInput.trim() ? parseFloat(weightInput.replace(",", ".")) : null;
    if (weightInput.trim() && (!Number.isFinite(weightValue) || (weightValue as number) <= 0)) {
      Alert.alert("Poids invalide", "Indique un poids valide en kg, ou laisse le champ vide.");
      return;
    }

    setSaving(true);
    try {
      await addProgressPhoto(pendingUri, weightValue, formatDate(selectedDate));
      cancelPending();
      loadHistory();
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Impossible d'enregistrer cette photo");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (item: ProgressPhotoEntry) => {
    Alert.alert(
      "Supprimer la photo",
      "Veux-tu vraiment supprimer cette photo de progression ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteProgressPhoto(item.id);
              setHistory((prev) => prev.filter((p) => p.id !== item.id));
            } catch (e: any) {
              Alert.alert("Erreur", e?.message || "Impossible de supprimer cette photo");
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScreenHeader title="Photos de progression" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* ============ Ajout d'une nouvelle photo ============ */}
        {!pendingUri ? (
          <>
            <View style={styles.emptyPreview}>
              <Ionicons name="body-outline" size={40} color="#94A3B8" />
              <Text style={styles.emptyPreviewText}>
                Prends une photo ou importe-la depuis ta galerie pour suivre ton évolution.
              </Text>
            </View>
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
          </>
        ) : (
          <View style={styles.formCard}>
            <Image source={{ uri: pendingUri }} style={styles.preview} />

            <Text style={styles.fieldLabel}>Date de la photo</Text>
            <Pressable style={styles.fieldInput} onPress={() => setShowDatePicker(true)}>
              <Ionicons name="calendar-outline" size={18} color="#407BFF" />
              <Text style={styles.fieldInputText}>{formatDisplayDate(formatDate(selectedDate))}</Text>
            </Pressable>

            <Text style={styles.fieldLabel}>Poids associé (kg)</Text>
            <View style={styles.fieldInput}>
              <Ionicons name="scale-outline" size={18} color="#407BFF" />
              <TextInput
                style={styles.fieldTextInput}
                value={weightInput}
                onChangeText={setWeightInput}
                placeholder="Ex. 68.5"
                keyboardType="decimal-pad"
                placeholderTextColor="#94A3B8"
              />
            </View>

            {showDatePicker ? (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                maximumDate={new Date()}
                onChange={handleDateChange}
              />
            ) : null}

            <View style={styles.formActions}>
              <Pressable style={styles.cancelBtn} onPress={cancelPending} disabled={saving}>
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </Pressable>
              <Pressable style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={18} color="#fff" />
                    <Text style={styles.saveBtnText}>Enregistrer</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        )}

        {/* ============ Historique ============ */}
        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <Ionicons name="time-outline" size={16} color="#1E293B" />
            <Text style={styles.historyTitle}>Historique</Text>
          </View>

          {historyLoading ? (
            <ActivityIndicator size="small" color="#407BFF" style={{ marginTop: 12 }} />
          ) : history.length === 0 ? (
            <EmptyState
              icon="images-outline"
              title="Aucune photo pour le moment"
              subtitle="Tes photos de progression apparaîtront ici."
            />
          ) : (
            history.map((item) => {
              const imageUri = getUploadUrl(item.image_url);
              return (
                <View key={item.id} style={styles.historyCard}>
                  {imageUri ? (
                    <Pressable onPress={() => setViewerUri(imageUri)} hitSlop={4}>
                      <Image source={{ uri: imageUri }} style={styles.historyThumb} />
                    </Pressable>
                  ) : (
                    <View style={[styles.historyThumb, styles.historyThumbPlaceholder]}>
                      <Ionicons name="image-outline" size={20} color="#94A3B8" />
                    </View>
                  )}
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyDate}>{formatDisplayDate(item.photo_date)}</Text>
                    <Text style={styles.historyWeight}>
                      {item.weight_kg != null ? `${item.weight_kg} kg` : "Poids non renseigné"}
                    </Text>
                  </View>
                  <Pressable
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(item)}
                    hitSlop={8}
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </Pressable>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* ============ Visionneuse plein écran ============ */}
      <Modal
        visible={!!viewerUri}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerUri(null)}
      >
        <Pressable style={styles.viewerBackdrop} onPress={() => setViewerUri(null)}>
          {viewerUri ? (
            <Image source={{ uri: viewerUri }} style={styles.viewerImage} resizeMode="contain" />
          ) : null}
          <Pressable
            style={styles.viewerCloseBtn}
            onPress={() => setViewerUri(null)}
            hitSlop={12}
          >
            <Ionicons name="close" size={26} color="#fff" />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F4F7FF",
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  error: {
    color: "#EF4444",
    textAlign: "center",
    marginBottom: 12,
  },
  emptyPreview: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
  },
  emptyPreviewText: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    marginTop: 10,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 8,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#407BFF",
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF4FF",
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
  },
  secondaryBtnText: {
    color: "#407BFF",
    fontSize: 14,
    fontWeight: "700",
  },
  formCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  preview: {
    width: "100%",
    height: 260,
    borderRadius: 14,
    marginBottom: 16,
    backgroundColor: "#F1F5F9",
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 6,
  },
  fieldInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 14,
    gap: 10,
  },
  fieldInputText: {
    fontSize: 14,
    color: "#1E293B",
    fontWeight: "600",
    textTransform: "capitalize",
  },
  fieldTextInput: {
    flex: 1,
    fontSize: 14,
    color: "#1E293B",
    fontWeight: "600",
    padding: 0,
  },
  formActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 14,
    paddingVertical: 14,
  },
  cancelBtnText: {
    color: "#475569",
    fontSize: 14,
    fontWeight: "700",
  },
  saveBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1E8F4E",
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  historySection: {
    marginTop: 8,
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1E293B",
  },
  historyCard: {
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
  historyThumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: "#F1F5F9",
  },
  historyThumbPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  historyInfo: {
    flex: 1,
  },
  historyDate: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
    textTransform: "capitalize",
  },
  historyWeight: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF2F2",
  },
  viewerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  viewerImage: {
    width: Dimensions.get("window").width,
    height: "80%",
  },
  viewerCloseBtn: {
    position: "absolute",
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
});