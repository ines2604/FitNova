import { ActivityLevel, Gender, Goal } from "../types/profile";

// "AAAA-MM-JJ" en heure LOCALE. Ne pas utiliser toISOString() : il donne la
// date UTC, donc la veille entre minuit et 1h du matin en Tunisie (UTC+1).
export const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const formatDisplayDate = (dateStr: string) => {
  // `dateStr` peut être soit une simple date "AAAA-MM-JJ", soit une chaîne
  // ISO complète renvoyée par MySQL pour une colonne DATE (ex. via l'API
  // photos de progression) : on ne garde que la partie date, à midi local,
  // pour éviter tout décalage de fuseau horaire.
  const datePart = dateStr.slice(0, 10);
  const date = new Date(`${datePart}T12:00:00`);
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