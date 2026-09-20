import React from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  ScheduledSession,
  WORKOUT_STATUS_COLORS,
  WORKOUT_STATUS_LABELS,
  formatSessionTimeHM,
  isOpenWorkoutStatus,
} from "@/types/scheduledSession";

type Props = {
  date: string;
  entries: ScheduledSession[];
  todayKey: string;
  busyId: number | null;
  onPlan?: () => void;
  onStart?: (entry: ScheduledSession) => void;
  onContinue?: (entry: ScheduledSession) => void;
  onCancel?: (entry: ScheduledSession) => void;
};

const isPastDay = (date: string, todayKey: string) => date < todayKey;

export default function WorkoutDayDetailCard({
  date,
  entries,
  todayKey,
  busyId,
  onPlan,
  onStart,
  onContinue,
  onCancel,
}: Props) {
  const dateLabel = new Date(`${date}T12:00:00`).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const label = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);

  const hasOpen = entries.some((e) => isOpenWorkoutStatus(e.status));
  const canPlan = !!onPlan && !isPastDay(date, todayKey) && !hasOpen;

  if (entries.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.dateLabel}>{label}</Text>
        <View style={styles.emptyRow}>
          <Ionicons name="barbell-outline" size={16} color="#94A3B8" />
          <Text style={styles.emptyText}>Aucune séance ce jour-là.</Text>
        </View>
        {canPlan ? (
          <Pressable style={styles.planBtn} onPress={onPlan}>
            <Ionicons name="add-circle-outline" size={18} color="#407BFF" />
            <Text style={styles.planBtnText}>Planifier une séance</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.dateLabel}>{label}</Text>

      {entries.map((entry, index) => {
        const color = WORKOUT_STATUS_COLORS[entry.status];
        const isToday = date === todayKey;
        const canStartPlanned =
          entry.status === "planned" && date >= todayKey && !!onStart;
        const canContinue = isOpenWorkoutStatus(entry.status) && !!onContinue;
        const canCancel =
          !!onCancel &&
          (entry.status === "planned" || isOpenWorkoutStatus(entry.status));
        const busy = busyId === entry.id;

        return (
          <View key={entry.id} style={[styles.entry, index > 0 && styles.entryDivider]}>
            <View style={styles.headerRow}>
              <View style={[styles.badge, { backgroundColor: `${color}1A` }]}>
                <View style={[styles.badgeDot, { backgroundColor: color }]} />
                <Text style={[styles.badgeText, { color }]}>
                  {WORKOUT_STATUS_LABELS[entry.status]}
                </Text>
              </View>
            </View>

            <Text style={styles.sessionName}>{entry.session_name}</Text>

            <View style={styles.row}>
              <Ionicons name="time-outline" size={16} color="#64748B" />
              <Text style={styles.rowText}>
                Début prévu à {formatSessionTimeHM(entry.scheduled_time)}
              </Text>
            </View>

            {entry.started_at ? (
              <View style={styles.row}>
                <Ionicons name="play-outline" size={16} color="#64748B" />
                <Text style={styles.rowText}>
                  Démarrée à{" "}
                  {formatSessionTimeHM(
                    entry.started_at.includes("T")
                      ? entry.started_at.slice(11, 19)
                      : entry.started_at.slice(11, 16)
                  )}
                </Text>
              </View>
            ) : null}

            {(entry.status === "completed" || entry.status === "cancelled") &&
            entry.actual_duration_seconds != null ? (
              <View style={styles.row}>
                <Ionicons name="timer-outline" size={16} color="#64748B" />
                <Text style={styles.rowText}>
                  Durée : {Math.max(1, Math.round(entry.actual_duration_seconds / 60))} min
                </Text>
              </View>
            ) : null}

            {(entry.status === "completed" || entry.status === "cancelled") &&
            entry.calories_burned != null ? (
              <View style={styles.row}>
                <Ionicons name="flame-outline" size={16} color="#22C55E" />
                <Text style={[styles.rowText, styles.caloriesText]}>
                  ~{entry.calories_burned} kcal brûlées (estimation)
                </Text>
              </View>
            ) : null}

            <View style={styles.actionsRow}>
              {canStartPlanned ? (
                <Pressable
                  style={styles.primaryBtn}
                  disabled={busy}
                  onPress={() => onStart!(entry)}
                >
                  {busy ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="play" size={16} color="#fff" />
                      <Text style={styles.primaryBtnText}>Commencer</Text>
                    </>
                  )}
                </Pressable>
              ) : null}

              {canContinue ? (
                <Pressable
                  style={styles.primaryBtn}
                  disabled={busy}
                  onPress={() => onContinue!(entry)}
                >
                  {busy ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="barbell" size={16} color="#fff" />
                      <Text style={styles.primaryBtnText}>Reprendre</Text>
                    </>
                  )}
                </Pressable>
              ) : null}

              {canCancel ? (
                <Pressable
                  style={styles.secondaryBtn}
                  disabled={busy}
                  onPress={() => onCancel!(entry)}
                >
                  <Text style={styles.secondaryBtnText}>Annuler</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        );
      })}

      {canPlan ? (
        <Pressable style={styles.planBtn} onPress={onPlan}>
          <Ionicons name="add-circle-outline" size={18} color="#407BFF" />
          <Text style={styles.planBtnText}>Planifier une autre séance</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    marginTop: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  dateLabel: { fontSize: 15, fontWeight: "700", color: "#1E293B", marginBottom: 12 },
  emptyRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  emptyText: { fontSize: 13, color: "#94A3B8" },
  entry: { paddingVertical: 4 },
  entryDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E2E8F0",
    marginTop: 12,
    paddingTop: 12,
  },
  headerRow: { flexDirection: "row", marginBottom: 6 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    gap: 6,
  },
  badgeDot: { width: 8, height: 8, borderRadius: 4 },
  badgeText: { fontSize: 12, fontWeight: "700" },
  sessionName: { fontSize: 14, fontWeight: "700", color: "#1E293B", marginBottom: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  rowText: { fontSize: 13, color: "#64748B", flex: 1 },
  caloriesText: { color: "#16A34A", fontWeight: "600" },
  actionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#22C55E",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  secondaryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
  },
  secondaryBtnText: { color: "#64748B", fontWeight: "600", fontSize: 13 },
  planBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    paddingVertical: 10,
  },
  planBtnText: { color: "#407BFF", fontWeight: "700", fontSize: 13 },
});
