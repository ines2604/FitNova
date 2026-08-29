import React, { useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants/colors";

type Props = {
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (date: string) => void;
  loggedDates: Set<string>; // dates avec une activité enregistrée (repas/eau/pas)
};

const DAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

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

const toDateKey = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addDays = (dateKey: string, amount: number) => {
  const d = new Date(`${dateKey}T12:00:00`);
  d.setDate(d.getDate() + amount);
  return toDateKey(d);
};

// Construit la liste des 7 jours de la semaine (lundi -> dimanche)
// contenant la date donnée.
const buildWeek = (dateKey: string): Date[] => {
  const base = new Date(`${dateKey}T12:00:00`);
  const jsDay = base.getDay(); // 0 = dimanche
  const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay;

  const monday = new Date(base);
  monday.setDate(base.getDate() + mondayOffset);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
};

const monthLabelFor = (week: Date[]) => {
  const first = week[0];
  const last = week[6];
  if (first.getMonth() === last.getMonth()) {
    return `${MONTHS[first.getMonth()]} ${first.getFullYear()}`;
  }
  if (first.getFullYear() === last.getFullYear()) {
    return `${MONTHS[first.getMonth()]} - ${MONTHS[last.getMonth()]} ${last.getFullYear()}`;
  }
  return `${MONTHS[first.getMonth()]} ${first.getFullYear()} - ${MONTHS[last.getMonth()]} ${last.getFullYear()}`;
};

export default function WeekStrip({ selectedDate, onSelectDate, loggedDates }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const todayKey = toDateKey(new Date());

  // Semaine précédente / actuelle / suivante, pour permettre un swipe fluide
  // dans les deux sens (semaines et mois).
  const weeks = useMemo(
    () => [
      buildWeek(addDays(selectedDate, -7)),
      buildWeek(selectedDate),
      buildWeek(addDays(selectedDate, 7)),
    ],
    [selectedDate]
  );

  const monthLabel = monthLabelFor(weeks[1]);

  const recenter = (width: number) => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ x: width, animated: false });
    });
  };

  const handleLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    if (width && width !== containerWidth) {
      setContainerWidth(width);
      recenter(width);
    }
  };

  const handleMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!containerWidth) return;
    const page = Math.round(e.nativeEvent.contentOffset.x / containerWidth);

    if (page === 0) {
      onSelectDate(addDays(selectedDate, -7));
    } else if (page === 2) {
      onSelectDate(addDays(selectedDate, 7));
    }
    recenter(containerWidth);
  };

  const goPrevWeek = () => onSelectDate(addDays(selectedDate, -7));
  const goNextWeek = () => onSelectDate(addDays(selectedDate, 7));

  return (
    <View>
      <View style={styles.monthHeader}>
        <Pressable onPress={goPrevWeek} style={styles.navBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={18} color={COLORS.primary} />
        </Pressable>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <Pressable onPress={goNextWeek} style={styles.navBtn} hitSlop={8}>
          <Ionicons name="chevron-forward" size={18} color={COLORS.primary} />
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onLayout={handleLayout}
        onMomentumScrollEnd={handleMomentumEnd}
        scrollEventThrottle={16}
      >
        {weeks.map((week, weekIndex) => (
          <View
            key={weekIndex}
            style={[styles.weekPage, containerWidth ? { width: containerWidth } : null]}
          >
            {week.map((date, index) => {
              const key = toDateKey(date);
              const isSelected = key === selectedDate;
              const isToday = key === todayKey;
              const isLogged = loggedDates.has(key);

              return (
                <Pressable
                  key={key}
                  onPress={() => onSelectDate(key)}
                  style={styles.dayWrapper}
                >
                  <Text style={[styles.dayLabel, isSelected && styles.dayLabelSelected]}>
                    {DAY_LABELS[index]}
                  </Text>

                  <View
                    style={[
                      styles.dayCircle,
                      isSelected && styles.dayCircleSelected,
                      !isSelected && isToday && styles.dayCircleToday,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayNumber,
                        isSelected && styles.dayNumberSelected,
                        !isSelected && isToday && styles.dayNumberToday,
                      ]}
                    >
                      {String(date.getDate()).padStart(2, "0")}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    marginBottom: 10,
  },
  navBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primaryLight,
  },
  monthLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textDark,
    textTransform: "capitalize",
    minWidth: 140,
    textAlign: "center",
  },
  weekPage: {
    flexDirection: "row",
  },
  dayWrapper: {
    flex: 1,
    alignItems: "center",
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textFaint,
    marginBottom: 8,
  },
  dayLabelSelected: {
    color: COLORS.primary,
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  dayCircleSelected: {
    backgroundColor: COLORS.primary,
  },
  dayCircleToday: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  dayNumber: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  dayNumberSelected: {
    color: "#fff",
  },
  dayNumberToday: {
    color: COLORS.primary,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "transparent",
    marginTop: 6,
  },
  dotActive: {
    backgroundColor: COLORS.primary,
  },
});
