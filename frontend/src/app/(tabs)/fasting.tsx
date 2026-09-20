import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { COLORS } from "@/constants/colors";
import {
  cancelFast,
  endFast,
  getCurrentFast,
  getFastingCalendar,
  startFast,
} from "@/services/fasting.service";
import {
  notifyFastStarted,
  notifyFastCompleted,
  cancelFastNotifications,
} from "@/services/notifications.service";
import {
  FastEntry,
  formatDurationHM,
  formatTimeHM,
  getFastTiming,
} from "@/types/fasting";
import FastingRing from "@/components/fasting/FastingRing";
import FastingCalendar from "@/components/fasting/FastingCalendar";
import FastDayDetailCard from "@/components/fasting/FastDayDetailCard";

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

export default function FastingScreen() {
  const router = useRouter();

  const [current, setCurrent] = useState<FastEntry | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [monthFasts, setMonthFasts] = useState<FastEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(todayKey());
  const [quickDuration, setQuickDuration] = useState("16");

  // Horloge interne pour rafraîchir le temps écoulé/restant chaque seconde
  // pendant qu'un jeûne est actif.
  const [tick, setTick] = useState(Date.now());
  useEffect(() => {
    if (current?.status !== "active") return;
    const interval = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [current?.status]);

  const loadCurrent = useCallback(async () => {
    try {
      const fast = await getCurrentFast();
      setCurrent(fast);
      setError("");
    } catch (e: any) {
      setError(e?.message || "Impossible de charger ton suivi de jeûne");
    }
  }, []);

  const loadMonth = useCallback(async (month: Date) => {
    try {
      const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
      const rows = await getFastingCalendar(key);
      setMonthFasts(rows);
    } catch {
      // Non bloquant : le calendrier reste simplement vide pour ce mois.
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      Promise.all([loadCurrent(), loadMonth(calendarMonth)]).finally(() => setLoading(false));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadCurrent])
  );

  useEffect(() => {
    loadMonth(calendarMonth);
  }, [calendarMonth, loadMonth]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadCurrent(), loadMonth(calendarMonth)]);
    setRefreshing(false);
  };

  const timing = useMemo(() => {
    if (!current) return null;
    return getFastTiming(current, tick);
  }, [current, tick]);

  const isEating = !current || current.status !== "active";

  // ============ Actions ============

  const handleQuickStart = async () => {
    if (busy) return;

    const duration = Number(quickDuration.replace(",", "."));
    if (!Number.isFinite(duration) || duration <= 0) {
      Alert.alert("Durée invalide", "Saisis un nombre d'heures valide (ex : 16).");
      return;
    }
    if (duration > 240) {
      Alert.alert("Durée invalide", "La durée maximale est de 240 heures.");
      return;
    }

    setBusy(true);
    try {
      const fast = await startFast({ durationHours: duration });
      setCurrent(fast);
      loadMonth(calendarMonth);
      await notifyStartSafely(fast);
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Impossible de démarrer le jeûne");
    } finally {
      setBusy(false);
    }
  };

  const timingEndAt = (fast: FastEntry) => getFastTiming(fast, Date.now()).endAt;

  // Le jeûne est déjà démarré côté serveur quand on arrive ici : une erreur de
  // notification ne doit pas déclencher l'alerte « Impossible de démarrer ».
  const notifyStartSafely = async (fast: FastEntry) => {
    try {
      const endAt = timingEndAt(fast);
      if (endAt) await notifyFastStarted(fast.id, endAt);
    } catch (notifError) {
      console.warn("Notification de début de jeûne :", notifError);
    }
  };

  const handleStartPlanned = async () => {
    if (!current || busy) return;
    setBusy(true);
    try {
      const fast = await startFast({ id: current.id });
      setCurrent(fast);
      loadMonth(calendarMonth);
      await notifyStartSafely(fast);
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Impossible de démarrer ce jeûne");
    } finally {
      setBusy(false);
    }
  };

  const handleEnd = () => {
    if (!current) return;
    Alert.alert(
      "Objectif atteint 🎉",
      "Bravo, la durée de ton jeûne est atteinte. Confirmer la fin ?",
      [
      { text: "Annuler", style: "cancel" },
      {
        text: "Terminer",
        onPress: async () => {
          setBusy(true);
          try {
            await endFast(current.id);
            // Le jeûne est terminé côté serveur : on met l'écran à jour tout
            // de suite, puis on s'occupe des notifications sans jamais
            // afficher d'erreur si l'une d'elles échoue.
            setCurrent(null);
            loadMonth(calendarMonth);
            try {
              await cancelFastNotifications(current.id);
              await notifyFastCompleted();
            } catch (notifError) {
              console.warn("Notification de fin de jeûne :", notifError);
            }
          } catch (e: any) {
            Alert.alert("Erreur", e?.message || "Impossible de terminer le jeûne");
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const handleCancel = () => {
    if (!current) return;
    Alert.alert(
      "Annuler le jeûne",
      current.status === "active"
        ? "Ce jeûne est en cours. Veux-tu vraiment l'annuler ?"
        : "Veux-tu annuler ce jeûne planifié ?",
      [
        { text: "Non", style: "cancel" },
        {
          text: "Oui, annuler",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            try {
              await cancelFast(current.id);
              await cancelFastNotifications(current.id);
              setCurrent(null);
              loadMonth(calendarMonth);
            } catch (e: any) {
              Alert.alert("Erreur", e?.message || "Impossible d'annuler le jeûne");
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  const selectedDayFasts = useMemo(
    () => monthFasts.filter((f) => f.plan_date.slice(0, 10) === selectedDate),
    [monthFasts, selectedDate]
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Jeûne</Text>
          <Text style={styles.subtitle}>
            Planifie, démarre et suis tes périodes de jeûne intermittent.
          </Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* ============ État actuel ============ */}
        <View
          style={[
            styles.stateBadge,
            { backgroundColor: isEating ? "#EAF7EF" : "#FFF1E6" },
          ]}
        >
          <Ionicons
            name={isEating ? "restaurant" : "flame"}
            size={16}
            color={isEating ? "#1E8F4E" : "#F08A24"}
          />
          <Text style={[styles.stateBadgeText, { color: isEating ? "#1E8F4E" : "#F08A24" }]}>
            {isEating ? "Période d'alimentation" : "En jeûne"}
          </Text>
        </View>

        {/* ============ Carte principale ============ */}
        {current?.status === "active" && timing ? (
          <View style={styles.card}>
            <FastingRing
              progress={timing.progress}
              color={timing.isOvertime ? COLORS.danger : "#F08A24"}
            >
              <Text style={styles.ringLabel}>Écoulé</Text>
              <Text style={styles.ringValue}>{formatDurationHM(timing.elapsedMs)}</Text>
              <Text style={styles.ringSub}>
                {timing.isOvertime
                  ? `+${formatDurationHM(timing.elapsedMs - current.duration_hours * 3600000)} de plus`
                  : `Reste ${formatDurationHM(timing.remainingMs)}`}
              </Text>
            </FastingRing>

            <Text style={styles.endAtText}>
              Objectif {current.duration_hours} h — fin prévue{" "}
              {timing.endAt?.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </Text>

            <View style={styles.actionsRow}>
              <Pressable style={styles.dangerBtn} onPress={handleCancel} disabled={busy}>
                <Ionicons name="close" size={18} color={COLORS.danger} />
                <Text style={styles.dangerBtnText}>Annuler</Text>
              </Pressable>
              {timing.isOvertime ? (
                <Pressable style={styles.primaryBtn} onPress={handleEnd} disabled={busy}>
                  {busy ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={18} color="#fff" />
                      <Text style={styles.primaryBtnText}>Terminer</Text>
                    </>
                  )}
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : current?.status === "planned" ? (
          <View style={styles.card}>
            <View style={styles.plannedIconWrap}>
              <Ionicons name="calendar" size={30} color={COLORS.primary} />
            </View>
            <Text style={styles.plannedTitle}>Jeûne planifié</Text>
            <Text style={styles.plannedDetail}>
              {new Date(`${current.plan_date}T12:00:00`).toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
              {" · "}
              {formatTimeHM(current.planned_start_time)} → {formatTimeHM(current.planned_end_time)}
              {" · "}
              {current.duration_hours} h
            </Text>

            <View style={styles.actionsRow}>
              <Pressable style={styles.dangerBtn} onPress={handleCancel} disabled={busy}>
                <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                <Text style={styles.dangerBtnText}>Annuler</Text>
              </Pressable>
              <Pressable style={styles.primaryBtn} onPress={handleStartPlanned} disabled={busy}>
                {busy ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="play" size={18} color="#fff" />
                    <Text style={styles.primaryBtnText}>Démarrer maintenant</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="moon-outline" size={30} color={COLORS.textFaint} />
            </View>
            <Text style={styles.plannedTitle}>Aucun jeûne en cours</Text>
            <Text style={styles.plannedDetail}>
              Saisis la durée de ton jeûne pour démarrer maintenant, ou planifie-le pour plus
              tard.
            </Text>

            <View style={styles.durationInputRow}>
              <TextInput
                style={styles.durationInput}
                keyboardType="numeric"
                placeholder="16"
                placeholderTextColor={COLORS.textFaint}
                value={quickDuration}
                onChangeText={(value) => setQuickDuration(value.replace(/[^0-9.,]/g, ""))}
                maxLength={5}
              />
              <Text style={styles.durationInputUnit}>heures de jeûne</Text>
            </View>

            <Pressable
              style={styles.primaryBtnFull}
              onPress={handleQuickStart}
              disabled={busy || !quickDuration.trim()}
            >
              {busy ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="play" size={18} color="#fff" />
                  <Text style={styles.primaryBtnText}>Démarrer maintenant</Text>
                </>
              )}
            </Pressable>

            <Pressable
              style={styles.secondaryBtn}
              onPress={() => router.push("/fasting-plan")}
              disabled={busy}
            >
              <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
              <Text style={styles.secondaryBtnText}>Planifier pour plus tard</Text>
            </Pressable>
          </View>
        )}

        {/* ============ Conseils ============ */}
        <Pressable style={styles.tipsBtnWrap} onPress={() => router.push("/fasting-tips")}>
          <LinearGradient
            colors={["#407BFF", "#6E9BFF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.tipsBtn}
          >
            <View style={styles.tipsBtnIcon}>
              <Ionicons name="bulb" size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tipsBtnTitle}>Conseils sur le jeûne</Text>
              <Text style={styles.tipsBtnSubtitle}>Astuces pour réussir tes jeûnes</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </LinearGradient>
        </Pressable>

        {/* ============ Historique / calendrier ============ */}
        <Text style={styles.sectionTitle}>Historique</Text>
        <FastingCalendar
          month={calendarMonth}
          fasts={monthFasts}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          onChangeMonth={(delta) =>
            setCalendarMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1))
          }
        />
        <FastDayDetailCard
          date={selectedDate}
          fasts={selectedDayFasts}
          onPlan={() => router.push(`/fasting-plan?date=${selectedDate}`)}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  header: {
    marginTop: 8,
    marginBottom: 14,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.textDark,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  error: {
    color: COLORS.danger,
    textAlign: "center",
    marginBottom: 12,
  },
  stateBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    marginBottom: 14,
  },
  stateBadgeText: {
    fontSize: 12,
    fontWeight: "800",
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  ringLabel: {
    fontSize: 12,
    color: COLORS.textFaint,
    fontWeight: "700",
  },
  ringValue: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.textDark,
    marginTop: 2,
  },
  ringSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
    fontWeight: "600",
  },
  endAtText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: "600",
    marginTop: 16,
    textAlign: "center",
  },
  plannedIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  plannedTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.textDark,
    textAlign: "center",
  },
  plannedDetail: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 6,
    paddingHorizontal: 8,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
    width: "100%",
  },
  primaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 13,
    gap: 8,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  dangerBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    paddingVertical: 13,
    gap: 8,
  },
  dangerBtnText: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: "700",
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primaryLight,
    borderRadius: 14,
    paddingVertical: 13,
    gap: 8,
    marginTop: 14,
    width: "100%",
  },
  secondaryBtnText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  durationInputRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 16,
  },
  durationInput: {
    width: 90,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.textDark,
    backgroundColor: COLORS.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 10,
  },
  durationInputUnit: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: "700",
  },
  primaryBtnFull: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 13,
    gap: 8,
    marginTop: 18,
    width: "100%",
  },
  tipsBtnWrap: {
    borderRadius: 18,
    marginBottom: 20,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  tipsBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  tipsBtnIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  tipsBtnTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },
  tipsBtnSubtitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.textDark,
    marginBottom: 12,
  },
});