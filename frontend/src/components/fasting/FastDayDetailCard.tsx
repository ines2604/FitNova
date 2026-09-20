import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants/colors";
import { FastEntry, STATUS_COLORS, STATUS_LABELS, formatTimeHM } from "@/types/fasting";

type Props = {
  date: string;
  fasts: FastEntry[];
  onPlan?: () => void;
};

const isPastDay = (date: string) => {
  const now = new Date();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
  return date < todayKey;
};

export default function FastDayDetailCard({ date, fasts, onPlan }: Props) {
  const dateLabel = new Date(`${date}T12:00:00`).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const label = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);

  // On peut planifier un nouveau jeûne ce jour-là tant qu'aucun jeûne
  // "ouvert" (planifié ou actif) n'y est déjà rattaché — un jour peut très
  // bien contenir un jeûne annulé/terminé et laisser la place à un nouveau.
  const hasOpenFast = fasts.some((f) => f.status === "planned" || f.status === "active");
  const canPlan = !!onPlan && !isPastDay(date) && !hasOpenFast;

  if (fasts.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.dateLabel}>{label}</Text>
        <View style={styles.emptyRow}>
          <Ionicons name="moon-outline" size={16} color={COLORS.textFaint} />
          <Text style={styles.emptyText}>Aucun jeûne ce jour-là.</Text>
        </View>

        {canPlan ? (
          <Pressable style={styles.planBtn} onPress={onPlan}>
            <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} />
            <Text style={styles.planBtnText}>Planifier un jeûne ce jour-là</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.dateLabel}>{label}</Text>

      {fasts.map((fast, index) => {
        const actualHours =
          fast.actual_duration_minutes != null
            ? Math.round((fast.actual_duration_minutes / 60) * 10) / 10
            : null;

        return (
          <View
            key={fast.id}
            style={[styles.entry, index > 0 && styles.entryDivider]}
          >
            <View style={styles.headerRow}>
              <View style={[styles.badge, { backgroundColor: `${STATUS_COLORS[fast.status]}1A` }]}>
                <View style={[styles.badgeDot, { backgroundColor: STATUS_COLORS[fast.status] }]} />
                <Text style={[styles.badgeText, { color: STATUS_COLORS[fast.status] }]}>
                  {STATUS_LABELS[fast.status]}
                </Text>
              </View>
            </View>

            <View style={styles.row}>
              <Ionicons name="time-outline" size={16} color={COLORS.textMuted} />
              <Text style={styles.rowText}>
                Prévu {formatTimeHM(fast.planned_start_time)} → {formatTimeHM(fast.planned_end_time)}{" "}
                ({fast.duration_hours} h)
              </Text>
            </View>

            {actualHours != null ? (
              <View style={styles.row}>
                <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.textMuted} />
                <Text style={styles.rowText}>Durée réellement tenue : {actualHours} h</Text>
              </View>
            ) : null}
          </View>
        );
      })}

      {canPlan ? (
        <Pressable style={styles.planBtn} onPress={onPlan}>
          <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} />
          <Text style={styles.planBtnText}>Planifier un nouveau jeûne ce jour-là</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.textDark,
    marginBottom: 10,
  },
  entry: {
    paddingTop: 2,
  },
  entryDivider: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  rowText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: "600",
  },
  emptyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textFaint,
  },
  planBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 14,
  },
  planBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.primary,
  },
});