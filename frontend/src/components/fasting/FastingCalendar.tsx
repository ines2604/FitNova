import React, { useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants/colors";
import { FastEntry, FastStatus, STATUS_COLORS } from "@/types/fasting";

type Props = {
  month: Date; // n'importe quelle date du mois affiché
  fasts: FastEntry[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  onChangeMonth: (delta: number) => void;
};

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

// Quand plusieurs jeûnes existent le même jour (ex : un annulé puis un
// second démarré et terminé), la pastille du calendrier met en avant le
// statut le plus significatif plutôt que le dernier/premier trouvé au
// hasard.
const STATUS_PRIORITY: FastStatus[] = ["active", "completed", "planned", "cancelled"];

const pickDominantStatus = (dayFasts: FastEntry[]): FastStatus =>
  STATUS_PRIORITY.find((status) => dayFasts.some((f) => f.status === status)) ||
  dayFasts[0].status;

const toKey = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

export default function FastingCalendar({
  month,
  fasts,
  selectedDate,
  onSelectDate,
  onChangeMonth,
}: Props) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();

  const fastsByDate = useMemo(() => {
    const map = new Map<string, FastEntry[]>();
    for (const f of fasts) {
      const key = f.plan_date.slice(0, 10);
      const list = map.get(key) || [];
      list.push(f);
      map.set(key, list);
    }
    return map;
  }, [fasts]);

  const weeks = useMemo(() => {
    const firstOfMonth = new Date(year, monthIndex, 1);
    const startWeekday = (firstOfMonth.getDay() + 6) % 7; // 0 = Lundi
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
          <Ionicons name="chevron-back" size={18} color={COLORS.textDark} />
        </Pressable>
        <Text style={styles.monthLabel}>
          {monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}
        </Text>
        <Pressable onPress={() => onChangeMonth(1)} style={styles.navBtn} hitSlop={8}>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textDark} />
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
            const dayFasts = fastsByDate.get(key);
            const isToday = key === todayKey;
            const isSelected = key === selectedDate;
            const dotColor = dayFasts ? STATUS_COLORS[pickDominantStatus(dayFasts)] : null;

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
                <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>
                  {day}
                </Text>
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
        {(["planned", "active", "completed", "cancelled"] as const).map((status) => (
          <View key={status} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: STATUS_COLORS[status] }]} />
            <Text style={styles.legendText}>
              {status === "planned"
                ? "Planifié"
                : status === "active"
                ? "En cours"
                : status === "completed"
                ? "Terminé"
                : "Annulé"}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  navBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: COLORS.background,
  },
  monthLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.textDark,
    textTransform: "capitalize",
  },
  weekdayRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  weekdayText: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textFaint,
  },
  weekRow: {
    flexDirection: "row",
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    margin: 1,
  },
  dayCellSelected: {
    backgroundColor: COLORS.primary,
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  dayText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textDark,
  },
  dayTextSelected: {
    color: "#fff",
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 2,
  },
  dotPlaceholder: {
    width: 5,
    height: 5,
    marginTop: 2,
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  legendText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: "600",
  },
});