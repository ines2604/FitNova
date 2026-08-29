// Coefficients d'activité (formule de Mifflin-St Jeor)
const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

// Ajustement calorique selon l'objectif
const GOAL_ADJUSTMENTS = {
  weight_loss: -400,
  muscle_gain: 300,
  maintenance: 0,
};

// Seuils de sécurité minimaux (recommandations générales, pas un avis médical)
const MIN_SAFE_CALORIES = {
  male: 1500,
  female: 1200,
};

// Calcule une suggestion d'objectif calorique quotidien
const suggestDailyCalorieGoal = ({
  age,
  gender,
  heightCm,
  weightKg,
  activityLevel,
  goal,
}) => {
  const normalizedAge = Number(age);
  const normalizedHeightCm = Number(heightCm);
  const normalizedWeightKg = Number(weightKg);

  if (
    !Number.isFinite(normalizedAge) ||
    !Number.isFinite(normalizedHeightCm) ||
    !Number.isFinite(normalizedWeightKg) ||
    (gender !== "male" && gender !== "female")
  ) {
    throw new Error("Paramètres invalides pour le calcul du BMR");
  }

  // Métabolisme de base (BMR)
  const bmr =
    gender === "male"
      ? 10 * normalizedWeightKg +
        6.25 * normalizedHeightCm -
        5 * normalizedAge +
        5
      : 10 * normalizedWeightKg +
        6.25 * normalizedHeightCm -
        5 * normalizedAge -
        161;

  const multiplier =
    ACTIVITY_MULTIPLIERS[activityLevel] || ACTIVITY_MULTIPLIERS.sedentary;
  const tdee = bmr * multiplier;

  const adjustment = GOAL_ADJUSTMENTS[goal] ?? GOAL_ADJUSTMENTS.maintenance;
  const adjusted = tdee + adjustment;

  // On ne descend jamais sous le seuil de sécurité, même en cas de déficit
  const floor = MIN_SAFE_CALORIES[gender];
  const finalValue = Math.max(adjusted, floor);

  return Math.round(finalValue);
};

module.exports = { suggestDailyCalorieGoal };