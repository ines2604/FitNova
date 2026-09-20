import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

type WorkoutCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  color: string;
  onPress: () => void;
};

const WorkoutCard = ({ icon, title, subtitle, color, onPress }: WorkoutCardProps) => (
  <Pressable style={styles.card} onPress={onPress}>
    <View style={[styles.cardIcon, { backgroundColor: color }]}>
      <Ionicons name={icon} size={26} color="#fff" />
    </View>
    <View style={styles.cardText}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardSubtitle}>{subtitle}</Text>
    </View>
    <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
  </Pressable>
);

const Workouts = () => {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Workouts</Text>
          <Text style={styles.subtitle}>
            Explore le catalogue d'exercices et construis tes séances.
          </Text>
        </View>

        <WorkoutCard
          icon="barbell"
          title="Exercices"
          subtitle="Cherche un exercice, filtre par partie du corps ou équipement"
          color="#22C55E"
          onPress={() => router.push("/workouts-exercises")}
        />

        <WorkoutCard
          icon="list"
          title="Mes séances"
          subtitle="Crée, démarre et gère tes séances"
          color="#407BFF"
          onPress={() => router.push("/workouts-sessions")}
        />

        <WorkoutCard
          icon="calendar"
          title="Calendrier"
          subtitle="Planifie tes séances, rappels 30 min avant, suivi et calories"
          color="#8B5CF6"
          onPress={() => router.push("/workouts-calendar")}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default Workouts;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F4F7FF",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1E293B",
  },
  subtitle: {
    fontSize: 14,
    color: "#94A3B8",
    marginTop: 6,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#1E293B" },
  cardSubtitle: { fontSize: 12, color: "#94A3B8", marginTop: 2 },
});
