import { ProfileFormValues, ProfileStepKey } from "../types/profile";
import { PROFILE_STEPS } from "../constants/profileSteps";

const parseNumber = (value: string) => Number(String(value).replace(",", "."));

export const validateStep = (
  key: ProfileStepKey,
  values: ProfileFormValues
): string | null => {
  if (key === "age") {
    const age = parseNumber(values.age);
    if (!values.age.trim()) return "L'âge est obligatoire";
    if (!Number.isInteger(age) || age < 13 || age > 120) {
      return "Indique un âge entre 13 et 120 ans";
    }
  }

  if (key === "gender" && !values.gender) {
    return "Choisis une option";
  }

  if (key === "heightCm") {
    const height = parseNumber(values.heightCm);
    if (!values.heightCm.trim()) return "La taille est obligatoire";
    if (!Number.isFinite(height) || height < 100 || height > 250) {
      return "Indique une taille entre 100 et 250 cm";
    }
  }

  if (key === "weightKg") {
    const weight = parseNumber(values.weightKg);
    if (!values.weightKg.trim()) return "Le poids est obligatoire";
    if (!Number.isFinite(weight) || weight < 30 || weight > 300) {
      return "Indique un poids entre 30 et 300 kg";
    }
  }

  if (key === "activityLevel" && !values.activityLevel) {
    return "Choisis ton niveau d'activité";
  }

  if (key === "goal" && !values.goal) {
    return "Choisis ton objectif";
  }

  if (key === "dailyWaterGoalMl") {
    const water = parseNumber(values.dailyWaterGoalMl);
    if (!Number.isFinite(water) || water < 1000 || water > 4000) {
      return "Indique un objectif d'eau entre 1 L et 4 L";
    }
  }

  if (key === "dailyStepGoal") {
    const steps = parseNumber(values.dailyStepGoal);
    if (!Number.isFinite(steps) || steps < 3000 || steps > 20000) {
      return "Indique un objectif de pas entre 3 000 et 20 000";
    }
  }

  return null;
};

export const validateAllSteps = (values: ProfileFormValues): string | null => {
  for (const step of PROFILE_STEPS) {
    const message = validateStep(step.key, values);
    if (message) return message;
  }
  return null;
};

export const parseProfileNumber = parseNumber;
