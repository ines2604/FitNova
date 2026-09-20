import React, { useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  ScheduledSession,
  ScheduledSessionStatus,
  WORKOUT_STATUS_COLORS,
} from "@/types/scheduledSession";

type Props = {
  month: Date;
  entries: ScheduledSession[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  onChangeMonth: (delta: number) => void;
};

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

const STATUS_PRIORITY: ScheduledSessionStatus[] = [
  "in_progress",
  "paused",
  "planned",
  "completed",
  "cancelled",
  "missed",
];

const pickDominantStatus = (dayEntries: ScheduledSession[]): ScheduledSessionStatus =>
  STATUS_PRIORITY.find((status) => dayEntries.some((e) => e.status === status)) ||
  dayEntries[0].status;

const toKey = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

export default function WorkoutCalendar({
  month,
  entries,
  selectedDate,
  onSelectDate,
  onChangeMonth,
}: Props) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();

  const entriesByDate = useMemo(() => {
    const map = new Map<string, ScheduledSession[]>();
    for (const e of entries) {
      const key = e.scheduled_date.slice(0, 10);
      const list = map.get(key) || [];
      list.push(e);
      map.set(key, list);
    }
    return map;
  }, [entries]);

  const weeks = useMemo(() => {
    const firstOfMonth = new Date(year, monthIndex, 1);
    const startWeekday = (firstOfMonth.getDay() + 6) % 7;
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    const cells: (number | null)[] = Array(startWeekday).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);

    const rows: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }, [year, monthIndex]);

  const todayKey = useMemo(() => {
    const now = new Date();
    return toKey(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const monthLabel = month.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return (
    <View style={styles.container}>
      <View style={styles.navRow}>
        <Pressable onPress={() => onChangeMonth(-1)} style={styles.navBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={18} color="#1E293B" />
        </Pressable>
        <Text style={styles.monthLabel}>
          {monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}
        </Text>
        <Pressable onPress={() => onChangeMonth(1)} style={styles.navBtn} hitSlop={8}>
          <Ionicons name="chevron-forward" size={18} color="#1E293B" />
        </Pressable>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((w, i) => (
          <Text key={i} style={styles.weekdayText}>
            {w}
          </Text>
        ))}
      </View>

      {weeks.map((row, ri) => (
        <View key={ri} style={styles.weekRow}>
          {row.map((day, ci) => {
            if (day === null) return <View key={ci} style={styles.dayCell} />;

            const key = toKey(year, monthIndex, day);
            const dayEntries = entriesByDate.get(key);
            const isToday = key === todayKey;
            const isSelected = key === selectedDate;
            const dotColor = dayEntries
              ? WORKOUT_STATUS_COLORS[pickDominantStatus(dayEntries)]
              : null;

            return (
              <Pressable
                key={ci}
                style={[
                  styles.dayCell,
                  isSelected && styles.dayCellSelected,
                  isToday && !isSelected && styles.dayCellToday,
                ]}
                onPress={() => onSelectDate(key)}
              >
                <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>{day}</Text>
                {dotColor ? (
                  <View
                    style={[styles.dot, { backgroundColor: isSelected ? "#fff" : dotColor }]}
                  />
                ) : (
                  <View style={styles.dotPlaceholder} />
                )}
              </Pressable>
            );
          })}
        </View>
      ))}

      <View style={styles.legendRow}>
        {(["planned", "in_progress", "completed", "cancelled"] as const).map((status) => (
          <View key={status} style={styles.legendItem}>
            <View
              style={[styles.legendDot, { backgroundColor: WORKOUT_STATUS_COLORS[status] }]}
            />
            <Text style={styles.legendText}>
              {status === "planned"
                ? "Planifiée"
                : status === "in_progress"
                ? "En cours"
                : status === "completed"
                ? "Terminée"
                : "Annulée"}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  monthLabel: { fontSize: 16, fontWeight: "700", color: "#1E293B" },
  weekdayRow: { flexDirection: "row", marginBottom: 6 },
  weekdayText: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
  },
  weekRow: { flexDirection: "row" },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    maxHeight: 44,
  },
  dayCellSelected: { backgroundColor: "#407BFF" },
  dayCellToday: { backgroundColor: "#EEF4FF" },
  dayText: { fontSize: 13, fontWeight: "600", color: "#1E293B" },
  dayTextSelected: { color: "#fff" },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 2 },
  dotPlaceholder: { width: 6, height: 6, marginTop: 2 },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E2E8F0",
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, color: "#64748B" },
});
