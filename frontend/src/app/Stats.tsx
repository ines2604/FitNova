import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { getDashboard } from "@/services/dashboard.service";
import { getFastingStats } from "@/services/fasting.service";
import { getWorkoutDurationStats } from "@/services/calendar.service";
import { DashboardData } from "@/types/dashboard";
import WeightProgressChart from "@/components/profile/WeightProgressChart";
import CaloriesEvolutionChart from "@/components/profile/CaloriesEvolutionChart";
import StepsEvolutionChart from "@/components/profile/StepsEvolutionChart";
import FastingHoursChart from "@/components/profile/FastingHoursChart";
import WorkoutDurationChart from "@/components/profile/WorkoutDurationChart";

// Fenêtre de récupération du suivi quotidien : assez large pour couvrir le
// filtre "cette année" (jusqu'à 366 jours) proposé sur les graphiques.
// Le graphique de poids, lui, reçoit tout l'historique quel que soit ce
// paramètre (l'API ne filtre pas weightProgress par date).
const DASHBOARD_DAYS_FETCH = 370;

export default function StatsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [fastingStats, setFastingStats] = useState<{ date: string; hours: number }[]>([]);
  const [workoutStats, setWorkoutStats] = useState<{ date: string; minutes: number }[]>([]);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [dashboardData, fastingData, workoutData] = await Promise.all([
        getDashboard(DASHBOARD_DAYS_FETCH),
        getFastingStats(DASHBOARD_DAYS_FETCH),
        getWorkoutDurationStats(DASHBOARD_DAYS_FETCH),
      ]);
      setDashboard(dashboardData);
      setFastingStats(fastingData);
      setWorkoutStats(workoutData);
      setError("");
    } catch (e: any) {
      setError(e?.message || "Impossible de charger les statistiques");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData().finally(() => setLoading(false));
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#1E293B" />
        </Pressable>
        <Text style={styles.headerTitle}>Mes statistiques</Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#407BFF" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {dashboard ? (
            <>
              <WeightProgressChart data={dashboard.weightProgress} />
              <CaloriesEvolutionChart data={dashboard.dailyStats} />
              <StepsEvolutionChart data={dashboard.dailyStats} />
              <WorkoutDurationChart data={workoutStats} />
              <FastingHoursChart data={fastingStats} />
            </>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F4F7FF",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1E293B",
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
});