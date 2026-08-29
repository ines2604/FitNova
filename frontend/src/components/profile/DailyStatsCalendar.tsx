import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DailyStat } from "@/types/dashboard";
import {
  formatDate,
  formatSteps,
  formatWater,
  formatSleepDuration,
  formatCalories,
} from "@/utils/formatters";

type Props = {
  dailyStats: DailyStat[];
};

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const MONTHS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

/**
 * Transforme "2026-08-27" en Date locale
 * sans problème de décalage UTC.
 */
const dateKeyToLocalDate = (dateKey: string) => {
  const [year, month, day] = dateKey.split("-").map(Number);

  return new Date(year, month - 1, day);
};

/**
 * Formate une date YYYY-MM-DD sans décalage d'un jour.
 */
const formatSelectedDate = (dateKey: string) => {
  const [year, month, day] = dateKey.split("-").map(Number);

  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const getMonthGrid = (year: number, month: number) => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Lundi = 0, Mardi = 1, ..., Dimanche = 6
  const startOffset = (firstDay.getDay() + 6) % 7;

  const days: (Date | null)[] = [];

  // Jours vides avant le 1er jour du mois
  for (let i = 0; i < startOffset; i++) {
    days.push(null);
  }

  // Jours du mois
  for (let day = 1; day <= lastDay.getDate(); day++) {
    days.push(new Date(year, month, day));
  }

  return days;
};

export default function DailyStatsCalendar({ dailyStats }: Props) {
  const today = new Date();

  const [viewDate, setViewDate] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const [selectedDate, setSelectedDate] = useState(toDateKey(today));

  /**
   * Map des statistiques par date.
   */
  const statsMap = useMemo(() => {
    const map = new Map<string, DailyStat>();

    dailyStats.forEach((stat) => {
      const key = String(stat.date).slice(0, 10);
      map.set(key, stat);
    });

    return map;
  }, [dailyStats]);

  const monthDays = getMonthGrid(
    viewDate.getFullYear(),
    viewDate.getMonth()
  );

  const selectedStat = statsMap.get(selectedDate);

  const changeMonth = (delta: number) => {
    setViewDate(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + delta, 1)
    );
  };

  return (
    <View style={styles.container}>
      {/* TITRE */}
      <Text style={styles.title}>Calendrier quotidien</Text>

      {/* MOIS */}
      <View style={styles.monthHeader}>
        <Pressable
          onPress={() => changeMonth(-1)}
          style={styles.navBtn}
        >
          <Ionicons
            name="chevron-back"
            size={20}
            color="#407BFF"
          />
        </Pressable>

        <Text style={styles.monthLabel}>
          {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
        </Text>

        <Pressable
          onPress={() => changeMonth(1)}
          style={styles.navBtn}
        >
          <Ionicons
            name="chevron-forward"
            size={20}
            color="#407BFF"
          />
        </Pressable>
      </View>

      {/* JOURS DE LA SEMAINE */}
      <View style={styles.weekdays}>
        {WEEKDAYS.map((day) => (
          <Text key={day} style={styles.weekday}>
            {day}
          </Text>
        ))}
      </View>

      {/* CALENDRIER */}
      <View style={styles.grid}>
        {monthDays.map((date, index) => {
          if (!date) {
            return (
              <View
                key={`empty-${index}`}
                style={styles.dayCell}
              />
            );
          }

          const key = toDateKey(date);

          const stat = statsMap.get(key);

          const isSelected = key === selectedDate;

          const isToday = key === toDateKey(today);

          const hasData =
            !!stat &&
            (
              stat.steps > 0 ||
              stat.water_intake_ml > 0 ||
              (stat.calories_consumed ?? 0) > 0 ||
              (stat.calories_burned ?? 0) > 0 ||
              (stat.sleep_duration_minutes ?? 0) > 0
            );

          return (
            <Pressable
              key={key}
              style={[
                styles.dayCell,
                isSelected && styles.daySelected,
                isToday && !isSelected && styles.dayToday,
              ]}
              onPress={() => setSelectedDate(key)}
            >
              <Text
                style={[
                  styles.dayNumber,
                  isSelected && styles.dayNumberSelected,
                ]}
              >
                {date.getDate()}
              </Text>

            </Pressable>
          );
        })}
      </View>

      {/* DETAILS DU JOUR */}
      <View style={styles.detailCard}>
        <Text style={styles.detailTitle}>
          {formatSelectedDate(selectedDate)}
        </Text>

        <View style={styles.statsGrid}>
          {/* PAS */}
          <StatPill
            icon="footsteps-outline"
            label="Pas"
            value={formatSteps(selectedStat?.steps ?? 0)}
          />

          {/* EAU */}
          <StatPill
            icon="water-outline"
            label="Eau"
            value={formatWater(
              selectedStat?.water_intake_ml ?? 0
            )}
          />

          {/* CALORIES CONSOMMÉES */}
          <StatPill
            icon="flame-outline"
            label="Consommées"
            value={formatCalories(selectedStat?.calories_consumed)}
          />

          {/* CALORIES BRÛLÉES */}
          <StatPill
            icon="bonfire-outline"
            label="Brûlées"
            value={formatCalories(selectedStat?.calories_burned)}
          />

          {/* SOMMEIL */}
          <StatPill
            icon="moon-outline"
            label="Sommeil"
            value={formatSleepDuration(
              selectedStat?.sleep_duration_minutes
            )}
          />
        </View>
      </View>
    </View>
  );
}

function StatPill({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.pill}>
      <Ionicons
        name={icon}
        size={18}
        color="#407BFF"
      />

      <Text style={styles.pillLabel}>
        {label}
      </Text>

      <Text style={styles.pillValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 2,
    },

    elevation: 2,
  },

  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 10,
  },

  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  navBtn: {
    padding: 4,
  },

  monthLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#334155",
  },

  weekdays: {
    flexDirection: "row",
    marginBottom: 4,
  },

  weekday: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "600",
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  /**
   * IMPORTANT :
   * On enlève aspectRatio: 1.
   *
   * Cela évite que les cellules deviennent trop hautes.
   */
  dayCell: {
    width: "14.28%",
    height: 36,

    alignItems: "center",
    justifyContent: "center",

    borderRadius: 10,
    marginBottom: 2,
  },

  daySelected: {
    backgroundColor: "#407BFF",
  },

  dayToday: {
    borderWidth: 1,
    borderColor: "#407BFF",
  },

  dayNumber: {
    fontSize: 13,
    color: "#334155",
    fontWeight: "600",
  },

  dayNumberSelected: {
    color: "#fff",
  },

  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#22C55E",
    marginTop: 2,
  },

  /**
   * DETAILS
   */
  detailCard: {
    marginTop: 10,
    paddingTop: 12,

    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },

  detailTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",

    marginBottom: 8,

    textTransform: "capitalize",
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  pill: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,

    paddingVertical: 8,
    paddingHorizontal: 10,

    width: "31.5%",
    marginBottom: 8,
  },

  pillLabel: {
    fontSize: 11,
    color: "#94A3B8",

    marginTop: 3,
  },

  pillValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",

    marginTop: 2,
  },
});