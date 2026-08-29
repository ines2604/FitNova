import { ActivityLevel, Gender, Goal } from "../types/profile";

export const formatDate = (date: Date) => date.toISOString().split("T")[0];

export const formatDisplayDate = (dateStr: string) => {
  const date = new Date(`${dateStr}T12:00:00`);
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

export const formatSleepDuration = (minutes?: number | null) => {
  if (!minutes || minutes <= 0) return "—";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours} h`;
  return `${hours} h ${mins} min`;
};

export const formatWater = (ml: number) => {
  if (ml >= 1000) return `${(ml / 1000).toFixed(1)} L`;
  return `${ml} ml`;
};

export const formatSteps = (steps: number) =>
  steps.toLocaleString("fr-FR");

export const formatCalories = (kcal?: number | null) => {
  if (!kcal || kcal <= 0) return "0 kcal";
  return `${Math.round(kcal).toLocaleString("fr-FR")} kcal`;
};

export const GENDER_LABELS: Record<Gender, string> = {
  male: "Homme",
  female: "Femme",
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Sédentaire",
  light: "Légèrement actif",
  moderate: "Modérément actif",
  active: "Actif",
  very_active: "Très actif",
};

export const GOAL_LABELS: Record<Goal, string> = {
  weight_loss: "Perte de poids",
  muscle_gain: "Prise de muscle",
  maintenance: "Maintien",
};

export const BMI_CATEGORY_LABELS: Record<string, string> = {
  underweight: "Insuffisance pondérale",
  normal: "Poids normal",
  overweight: "Surpoids",
  obese: "Obésité",
};