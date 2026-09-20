import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";

import ScreenHeader from "@/components/nutrition/ScreenHeader";
import TimePickerModal from "@/components/home/TimePickerModal";
import WorkoutCalendar from "@/components/workouts/WorkoutCalendar";
import WorkoutDayDetailCard from "@/components/workouts/WorkoutDayDetailCard";
import { cancelScheduledSession, getWorkoutCalendar, scheduleSession } from "@/services/calendar.service";
import { getSessionById, getSessions } from "@/services/sessions.service";
import {
  cancelWorkoutReminder,
  scheduleWorkoutReminder,
} from "@/services/notifications.service";
import { ScheduledSession, scheduledSessionStartAt } from "@/types/scheduledSession";
import { WorkoutSession, WorkoutSessionSummary } from "@/types/session";

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

const monthBounds = (month: Date) => {
  const y = month.getFullYear();
  const m = month.getMonth();
  const from = `${y}-${String(m + 1).padStart(2, "0")}-01`;
  const last = new Date(y, m + 1, 0).getDate();
  const to = `${y}-${String(m + 1).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  return { from, to };
};

const formatTimeForApi = (date: Date) =>
  `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

const formatSessionDuration = (seconds: number) => {
  if (!seconds || seconds <= 0) return "—";
  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} h`;
  return `${hours} h ${minutes} min`;
};

const formatSeconds = (seconds: number | null) => {
  if (!seconds || seconds <= 0) return null;
  if (seconds < 60) return `${seconds} s`;
  const m = Math.floor(seconds / 60);
  const r = seconds % 60;
  return r === 0 ? `${m} min` : `${m} min ${r} s`;
};

export default function WorkoutsCalendarScreen() {
  const router = useRouter();
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [monthEntries, setMonthEntries] = useState<ScheduledSession[]>([]);
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [planModalVisible, setPlanModalVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [sessionTemplates, setSessionTemplates] = useState<WorkoutSessionSummary[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [pickedSessionId, setPickedSessionId] = useState<number | null>(null);
  // Séance dépliée dans la liste (flèche) + détails chargés à la demande.
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [detailsById, setDetailsById] = useState<Record<number, WorkoutSession>>({});
  const [loadingDetailId, setLoadingDetailId] = useState<number | null>(null);
  const [planTime, setPlanTime] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 60);
    d.setSeconds(0, 0);
    return d;
  });

  const loadMonth = useCallback(async (month: Date) => {
    const { from, to } = monthBounds(month);
    const rows = await getWorkoutCalendar(from, to);
    setMonthEntries(rows);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadMonth(calendarMonth)
        .catch(() => setMonthEntries([]))
        .finally(() => setLoading(false));
    }, [calendarMonth, loadMonth])
  );

  useEffect(() => {
    loadMonth(calendarMonth).catch(() => {});
  }, [calendarMonth, loadMonth]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadMonth(calendarMonth);
    } finally {
      setRefreshing(false);
    }
  };

  const dayEntries = useMemo(
    () => monthEntries.filter((e) => e.scheduled_date.slice(0, 10) === selectedDate),
    [monthEntries, selectedDate]
  );

  const openPlanFlow = async () => {
    setPlanModalVisible(true);
    setLoadingTemplates(true);
    try {
      const list = await getSessions();
      setSessionTemplates(list);
      setDetailsById({});
      setExpandedId(null);
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Impossible de charger tes séances");
      setPlanModalVisible(false);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const toggleDetails = async (session: WorkoutSessionSummary) => {
    if (expandedId === session.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(session.id);
    if (detailsById[session.id]) return;
    setLoadingDetailId(session.id);
    try {
      const full = await getSessionById(session.id);
      setDetailsById((prev) => ({ ...prev, [session.id]: full }));
    } catch (e: any) {
      setExpandedId(null);
      Alert.alert("Erreur", e?.message || "Impossible de charger les détails de la séance");
    } finally {
      setLoadingDetailId(null);
    }
  };

  const closePlanModal = () => {
    setPlanModalVisible(false);
    setExpandedId(null);
  };

  const onPickTemplate = (session: WorkoutSessionSummary) => {
    setPickedSessionId(session.id);
    closePlanModal();
    setTimePickerVisible(true);
  };

  const confirmPlanTime = async (time: Date) => {
    if (!pickedSessionId) return;

    const startAt = new Date(`${selectedDate}T${formatTimeForApi(time)}:00`);
    if (startAt.getTime() <= Date.now()) {
      Alert.alert("Heure invalide", "Choisis une heure de début dans le futur.");
      return;
    }

    setBusyId(-1);
    try {
      const entry = await scheduleSession({
        sessionId: pickedSessionId,
        date: selectedDate,
        time: formatTimeForApi(time),
      });
      const template = sessionTemplates.find((s) => s.id === pickedSessionId);
      await scheduleWorkoutReminder(
        entry.id,
        entry.session_name || template?.name || "Séance",
        scheduledSessionStartAt(entry)
      );
      await loadMonth(calendarMonth);
      Alert.alert("Planifiée", "Rappel 30 min avant le début.");
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Planification impossible");
    } finally {
      setBusyId(null);
      setPickedSessionId(null);
    }
  };

  const handleStartPlanned = (entry: ScheduledSession) => {
    router.push({
      pathname: "/workouts-active-session",
      params: { scheduledId: String(entry.id) },
    } as never);
  };

  const handleContinue = (entry: ScheduledSession) => {
    router.push({
      pathname: "/workouts-active-session",
      params: { scheduledId: String(entry.id) },
    });
  };

  const handleCancelEntry = (entry: ScheduledSession) => {
    Alert.alert(
      "Annuler cette séance",
      entry.status === "planned"
        ? "Retirer cette planification du calendrier ?"
        : "Annuler la séance en cours ?",
      [
        { text: "Non", style: "cancel" },
        {
          text: "Oui",
          style: "destructive",
          onPress: async () => {
            setBusyId(entry.id);
            try {
              await cancelWorkoutReminder(entry.id);
              await cancelScheduledSession(entry.id);
              await loadMonth(calendarMonth);
            } catch (e: any) {
              Alert.alert("Erreur", e?.message || "Annulation impossible");
            } finally {
              setBusyId(null);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScreenHeader title="Calendrier sport" />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#22C55E" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <WorkoutCalendar
            month={calendarMonth}
            entries={monthEntries}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onChangeMonth={(delta) =>
              setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1))
            }
          />

          <WorkoutDayDetailCard
            date={selectedDate}
            entries={dayEntries}
            todayKey={todayKey()}
            busyId={busyId}
            onPlan={openPlanFlow}
            onStart={handleStartPlanned}
            onContinue={handleContinue}
            onCancel={handleCancelEntry}
          />
        </ScrollView>
      )}

      <Modal visible={planModalVisible} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={closePlanModal}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Choisir une séance</Text>
            {loadingTemplates ? (
              <ActivityIndicator color="#22C55E" style={{ marginVertical: 24 }} />
            ) : sessionTemplates.length === 0 ? (
              <Text style={styles.modalEmpty}>
                Crée d'abord une séance dans « Mes séances ».
              </Text>
            ) : (
              <FlatList
                data={sessionTemplates}
                keyExtractor={(item) => String(item.id)}
                style={{ maxHeight: 440 }}
                renderItem={({ item }) => {
                  const expanded = expandedId === item.id;
                  const detail = detailsById[item.id];
                  return (
                    <View style={styles.templateBlock}>
                      <View style={styles.templateRow}>
                        <Pressable
                          style={styles.templateMain}
                          onPress={() => onPickTemplate(item)}
                        >
                          <Ionicons name="barbell-outline" size={18} color="#22C55E" />
                          <Text style={styles.templateName} numberOfLines={1}>
                            {item.name}
                          </Text>
                          <Text style={styles.templateDuration}>
                            {formatSessionDuration(item.total_duration_seconds)}
                          </Text>
                        </Pressable>
                        <Pressable
                          style={styles.chevronBtn}
                          hitSlop={8}
                          onPress={() => void toggleDetails(item)}
                          accessibilityLabel={
                            expanded ? "Masquer les détails" : "Afficher les détails"
                          }
                        >
                          <Ionicons
                            name={expanded ? "chevron-down" : "chevron-forward"}
                            size={20}
                            color={expanded ? "#22C55E" : "#94A3B8"}
                          />
                        </Pressable>
                      </View>

                      {expanded ? (
                        <View style={styles.detailBox}>
                          {loadingDetailId === item.id || !detail ? (
                            <ActivityIndicator color="#22C55E" style={{ marginVertical: 8 }} />
                          ) : detail.exercises.length === 0 ? (
                            <Text style={styles.detailEmpty}>Cette séance ne contient aucun exercice.</Text>
                          ) : (
                            <>
                              <Text style={styles.detailSummary}>
                                {detail.exercises.length} exercice
                                {detail.exercises.length > 1 ? "s" : ""} ·{" "}
                                {formatSessionDuration(item.total_duration_seconds)}
                              </Text>
                              {detail.exercises.map((ex, idx) => {
                                const dur = formatSeconds(ex.duration_seconds);
                                const rest = formatSeconds(ex.rest_seconds);
                                return (
                                  <View key={ex.id} style={styles.detailRow}>
                                    <Text style={styles.detailIndex}>{idx + 1}</Text>
                                    <View style={{ flex: 1 }}>
                                      <Text style={styles.detailName} numberOfLines={2}>
                                        {ex.exercise_name}
                                      </Text>
                                      <Text style={styles.detailMeta}>
                                        {ex.sets} série{ex.sets > 1 ? "s" : ""}
                                        {dur ? ` × ${dur}` : ""}
                                        {rest ? ` · repos ${rest}` : ""}
                                        {ex.body_part ? ` · ${ex.body_part}` : ""}
                                      </Text>
                                    </View>
                                  </View>
                                );
                              })}
                            </>
                          )}
                          <Pressable style={styles.detailPickBtn} onPress={() => onPickTemplate(item)}>
                            <Text style={styles.detailPickText}>Planifier cette séance</Text>
                          </Pressable>
                        </View>
                      ) : null}
                    </View>
                  );
                }}
              />
            )}
            <Pressable style={styles.modalClose} onPress={closePlanModal}>
              <Text style={styles.modalCloseText}>Fermer</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <TimePickerModal
        visible={timePickerVisible}
        value={planTime}
        title="Heure de début"
        onClose={() => {
          setTimePickerVisible(false);
          setPickedSessionId(null);
        }}
        onConfirm={(date) => {
          setPlanTime(date);
          void confirmPlanTime(date);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F4F7FF" },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 28,
  },
  modalTitle: { fontSize: 17, fontWeight: "800", color: "#1E293B", marginBottom: 12 },
  modalEmpty: { fontSize: 14, color: "#94A3B8", marginVertical: 16 },
  templateBlock: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E2E8F0",
  },
  templateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  templateMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
  },
  chevronBtn: { paddingVertical: 14, paddingHorizontal: 6 },
  detailBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  detailSummary: { fontSize: 12, fontWeight: "700", color: "#64748B", marginBottom: 8 },
  detailEmpty: { fontSize: 13, color: "#94A3B8", marginBottom: 8 },
  detailRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 6 },
  detailIndex: {
    width: 22,
    height: 22,
    borderRadius: 11,
    textAlign: "center",
    lineHeight: 22,
    fontSize: 12,
    fontWeight: "800",
    color: "#22C55E",
    backgroundColor: "#DCFCE7",
    overflow: "hidden",
  },
  detailName: { fontSize: 13, fontWeight: "700", color: "#1E293B", textTransform: "capitalize" },
  detailMeta: { fontSize: 12, color: "#64748B", marginTop: 2 },
  detailPickBtn: {
    marginTop: 10,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#22C55E",
    borderRadius: 10,
  },
  detailPickText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  templateName: { flex: 1, fontSize: 14, fontWeight: "600", color: "#1E293B" },
  templateDuration: { fontSize: 12, fontWeight: "700", color: "#22C55E" },
  modalClose: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
  },
  modalCloseText: { fontWeight: "700", color: "#475569" },
});
