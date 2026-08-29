import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import HomeHeader from "@/components/HomeHeader";
import WeekStrip from "@/components/home/WeekStrip";
import CalorieSummary from "@/components/home/CalorieSummary";
import MealSection from "@/components/home/MealSection";
import AddMealSheet from "@/components/home/AddMealSheet";
import WaterCard from "@/components/home/WaterCard";
import SleepCard from "@/components/home/SleepCard";
import StepsCard from "@/components/home/StepsCard";
import { COLORS } from "@/constants/colors";
import { getMe } from "@/services/user.service";
import { getDailyTracking, logWater, logSleep } from "@/services/tracking.service";
import { getDashboard } from "@/services/dashboard.service";
import { getMealsByDate, deleteMeal as deleteMealRequest } from "@/services/meals.service";
import { getProfile } from "@/services/profile.service";
import { getUploadUrl } from "@/utils/media";
import { useStepTracker } from "@/hooks/useStepTracker";
import { AppUser } from "@/types/user";
import { DailyTracking } from "@/types/tracking";
import { MealEntry, MealType } from "@/types/meal";

const DEFAULT_WATER_GOAL_ML = 2000;
const DEFAULT_CALORIE_GOAL = 2000;
const DEFAULT_STEP_GOAL = 10000;
const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

const toDateKey = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const Home = () => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));
  const [tracking, setTracking] = useState<DailyTracking | null>(null);
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [loggedDates, setLoggedDates] = useState<Set<string>>(new Set());
  const [waterGoalMl, setWaterGoalMl] = useState(DEFAULT_WATER_GOAL_ML);
  const [calorieGoal, setCalorieGoal] = useState(DEFAULT_CALORIE_GOAL);
  const [stepGoal, setStepGoal] = useState(DEFAULT_STEP_GOAL);
  const [weightKg, setWeightKg] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetMealType, setSheetMealType] = useState<MealType | null>(null);

  const loadForDate = useCallback(async (date: string) => {
    try {
      const [trackingData, mealsData] = await Promise.all([
        getDailyTracking(date),
        getMealsByDate(date),
      ]);
      setTracking(trackingData);
      setMeals(mealsData);
      setError("");
    } catch (e: any) {
      setError(e?.message || "Impossible de charger les données");
    }
  }, []);

  const loadAll = useCallback(
    async (date: string) => {
      try {
        const [userData, dashboardData, profileData] = await Promise.all([
          getMe(),
          getDashboard(180),
          getProfile().catch(() => null),
          loadForDate(date),
        ]);
        setUser(userData);
        if (profileData?.weight_kg) {
          setWeightKg(profileData.weight_kg);
        }
        if (dashboardData?.goals?.dailyWaterGoalMl) {
          setWaterGoalMl(dashboardData.goals.dailyWaterGoalMl);
        }
        if (dashboardData?.goals?.dailyCalorieGoal) {
          setCalorieGoal(dashboardData.goals.dailyCalorieGoal);
        }
        if (dashboardData?.goals?.dailyStepGoal) {
          setStepGoal(dashboardData.goals.dailyStepGoal);
        }
        const logged = new Set<string>();
        (dashboardData?.dailyStats || []).forEach((day) => {
          if (
            (day.calories_consumed && day.calories_consumed > 0) ||
            (day.water_intake_ml && day.water_intake_ml > 0)
          ) {
            logged.add(day.date);
          }
        });
        setLoggedDates(logged);
      } catch (e: any) {
        setError(e?.message || "Impossible de charger les données");
      }
    },
    [loadForDate]
  );

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadAll(selectedDate).finally(() => setLoading(false));
    }, [selectedDate, loadAll])
  );

  const handleSelectDate = async (date: string) => {
    setSelectedDate(date);
    setLoading(true);
    await loadForDate(date);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll(selectedDate);
    setRefreshing(false);
  };

  const handleWaterChange = async (amountMl: number) => {
    try {
      const updated = await logWater(amountMl, selectedDate);
      setTracking(updated);
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Impossible de mettre à jour l'eau");
    }
  };

  const handleSaveSleep = async (bedtimeIso: string, wakeTimeIso: string) => {
    try {
      const updated = await logSleep(bedtimeIso, wakeTimeIso, selectedDate);
      setTracking(updated);
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Impossible d'enregistrer le sommeil");
    }
  };

  const handleOpenAdd = (mealType: MealType) => {
    setSheetMealType(mealType);
    setSheetVisible(true);
  };

  const handleMealAdded = () => {
    loadAll(selectedDate);
  };

  const handleDeleteMeal = async (meal: MealEntry) => {
    try {
      await deleteMealRequest(meal.id);
      loadAll(selectedDate);
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Impossible de supprimer cet aliment");
    }
  };

  const isToday = selectedDate === toDateKey(new Date());

  const stepTracker = useStepTracker({
    enabled: isToday,
    date: selectedDate,
    weightKg,
    initialSteps: tracking?.steps || 0,
    onSynced: (updated) => setTracking(updated),
  });

  const mealsByType = useMemo(() => {
    const grouped: Record<MealType, MealEntry[]> = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
    };
    meals.forEach((m) => {
      if (grouped[m.meal_type]) grouped[m.meal_type].push(m);
    });
    return grouped;
  }, [meals]);

  const totals = useMemo(() => {
    return meals.reduce(
      (acc, m) => ({
        calories: acc.calories + (Number(m.calories) || 0),
        protein: acc.protein + (Number(m.protein) || 0),
        carbs: acc.carbs + (Number(m.carbs) || 0),
        fat: acc.fat + (Number(m.fat) || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [meals]);

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  const avatarUrl = getUploadUrl(user?.profile_photo);

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <HomeHeader name={user?.full_name || ""} avatar={avatarUrl} />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <WeekStrip
          selectedDate={selectedDate}
          onSelectDate={handleSelectDate}
          loggedDates={loggedDates}
        />

        <CalorieSummary
          consumedCalories={totals.calories}
          goalCalories={calorieGoal}
          consumedProtein={totals.protein}
          consumedCarbs={totals.carbs}
          consumedFat={totals.fat}
        />

        <Text style={styles.sectionTitle}>Repas</Text>

        {MEAL_TYPES.map((type) => (
          <MealSection
            key={type}
            mealType={type}
            meals={mealsByType[type]}
            onAdd={handleOpenAdd}
            onDelete={handleDeleteMeal}
          />
        ))}

        <Text style={styles.sectionTitle}>Suivi du jour</Text>

        <View style={styles.trackingCard}>
          <StepsCard
            steps={isToday ? stepTracker.steps : tracking?.steps || 0}
            goalSteps={stepGoal}
            caloriesBurned={
              isToday
                ? stepTracker.caloriesBurned
                : tracking?.calories_burned || 0
            }
            caloriesSource={stepTracker.caloriesSource}
            isToday={isToday}
            status={stepTracker.status}
            source={stepTracker.source}
            onRequestPermission={stepTracker.requestPermission}
            onOpenHealthConnectInstall={stepTracker.openHealthConnectInstall}
            onOpenHealthConnectSettings={stepTracker.openHealthConnectSettings}
          />
          <View style={styles.divider} />
          <WaterCard
            currentMl={tracking?.water_intake_ml || 0}
            goalMl={waterGoalMl}
            onChange={handleWaterChange}
          />
          <View style={styles.divider} />
          <SleepCard
            bedtime={tracking?.bedtime ?? null}
            wakeTime={tracking?.wake_time ?? null}
            durationMinutes={tracking?.sleep_duration_minutes ?? null}
            onSave={handleSaveSleep}
          />
        </View>
      </ScrollView>

      <AddMealSheet
        visible={sheetVisible}
        mealType={sheetMealType}
        date={selectedDate}
        onClose={() => setSheetVisible(false)}
        onAdded={handleMealAdded}
      />
    </SafeAreaView>
  );
};

export default Home;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  error: {
    color: COLORS.danger,
    textAlign: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textFaint,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 6,
    marginBottom: 10,
  },
  trackingCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    paddingHorizontal: 16,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
});