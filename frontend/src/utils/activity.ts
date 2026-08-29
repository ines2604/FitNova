// Estimation des calories brûlées à partir du nombre de pas.
//
// Formule basée sur l'équivalent MET (Metabolic Equivalent of Task) de la
// marche modérée (~5 km/h, MET ≈ 3.5), comme utilisé par la plupart des
// trackers d'activité grand public (Samsung Health, Google Fit, etc.) :
//
//   kcal/min = (MET × 3.5 × poids(kg)) / 200
//   à 5 km/h, 1 km ≈ 12 minutes de marche
//   => kcal/km ≈ 0.735 × poids(kg)
//
// On combine avec une longueur de foulée moyenne pour convertir les pas
// en distance. C'est une estimation (comme sur tous les trackers grand
// public sans capteur de fréquence cardiaque), pas une mesure médicale.

const AVERAGE_STEP_LENGTH_M = 0.762; // foulée moyenne adulte
const KCAL_PER_KG_PER_KM = 0.75; // marche modérée, MET ≈ 3.5
const DEFAULT_WEIGHT_KG = 70;

export const estimateCaloriesFromSteps = (
  steps: number,
  weightKg?: number | null
): number => {
  if (!steps || steps <= 0) return 0;

  const weight =
    weightKg && weightKg > 0 ? weightKg : DEFAULT_WEIGHT_KG;

  const distanceKm = (steps * AVERAGE_STEP_LENGTH_M) / 1000;
  const calories = distanceKm * weight * KCAL_PER_KG_PER_KM;

  return Math.round(calories);
};

// Distance parcourue (en km) à partir du nombre de pas, pratique pour
// un futur affichage complémentaire ("x km parcourus aujourd'hui").
export const estimateDistanceKmFromSteps = (steps: number): number => {
  if (!steps || steps <= 0) return 0;
  return Math.round(((steps * AVERAGE_STEP_LENGTH_M) / 1000) * 100) / 100;
};
