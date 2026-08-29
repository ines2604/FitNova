import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { UserProfile } from "@/types/profile";
import {
  ACTIVITY_LABELS,
  BMI_CATEGORY_LABELS,
  GENDER_LABELS,
  GOAL_LABELS,
} from "@/utils/formatters";

type Props = {
  profile: UserProfile;
};

export default function ProfileInfoCard({ profile }: Props) {
  const rows = [
    { label: "Âge", value: `${profile.age} ans` },
    { label: "Sexe", value: GENDER_LABELS[profile.gender] },
    { label: "Taille", value: `${profile.height_cm} cm` },
    { label: "Poids", value: `${profile.weight_kg} kg` },
    {
      label: "IMC",
      value: profile.bmi
        ? `${profile.bmi.toFixed(1)}${
            profile.bmiCategory
              ? ` (${BMI_CATEGORY_LABELS[profile.bmiCategory] || profile.bmiCategory})`
              : ""
          }`
        : "—",
    },
    {
      label: "Activité",
      value: ACTIVITY_LABELS[profile.activity_level],
    },
    { label: "Objectif", value: GOAL_LABELS[profile.goal] },
    {
      label: "Objectif calories",
      value: profile.daily_calorie_goal
        ? `${profile.daily_calorie_goal} kcal/j`
        : "—",
    },
    {
      label: "Objectif eau",
      value: profile.daily_water_goal_ml
        ? `${(profile.daily_water_goal_ml / 1000).toFixed(1)} L/j`
        : "—",
    },
    {
      label: "Objectif pas",
      value: profile.daily_step_goal
        ? `${profile.daily_step_goal.toLocaleString("fr-FR")} pas/j`
        : "—",
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Informations du profil</Text>
      {rows.map((row) => (
        <View key={row.label} style={styles.row}>
          <Text style={styles.label}>{row.label}</Text>
          <Text style={styles.value}>{row.value}</Text>
        </View>
      ))}
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
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  label: {
    fontSize: 14,
    color: "#64748B",
  },
  value: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
    textAlign: "right",
    flex: 1,
    marginLeft: 12,
  },
});
