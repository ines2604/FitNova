// Estimation de la durée et des calories brûlées d'une séance, à partir de
// ses exercices (sets, durée, repos) et du poids de l'utilisateur.
//
// Même principe que frontend/src/utils/activity.ts (déjà utilisé pour les
// pas) : kcal/min = MET × 3.5 × poids(kg) / 200. Le MET est une estimation
// grossière par manque de donnée plus précise par exercice :
//  - 8 (cardio modéré à soutenu) si l'exercice cible le cardio (body_part)
//  - 5 (renforcement musculaire modéré) sinon
// Ce sont des ordres de grandeur usuels (mêmes tables MET que la plupart des
// trackers grand public), pas une mesure individualisée.

const MET_CARDIO = 8;
const MET_STRENGTH = 5;
const DEFAULT_SET_SECONDS = 60; // durée par défaut d'une série quand duration_seconds est absent en base
const DEFAULT_WEIGHT_KG = 70;

function metFor(exercise) {
  return (exercise.body_part || "").toLowerCase() === "cardio" ? MET_CARDIO : MET_STRENGTH;
}

// Temps total estimé d'un exercice dans la séance : le "travail" (séries ×
// durée par série) + le repos entre les séries de cet exercice.
function exerciseSeconds(exercise) {
  const sets = exercise.sets || 1;
  const workSeconds = exercise.duration_seconds || DEFAULT_SET_SECONDS;
  const restSeconds = exercise.rest_seconds || 0;
  return sets * workSeconds + sets * restSeconds;
}

const estimateSessionDurationSeconds = (sessionExercises = []) => {
  return sessionExercises.reduce((total, ex) => total + exerciseSeconds(ex), 0);
};

const estimateSessionCalories = (sessionExercises = [], weightKg) => {
  const weight = weightKg && weightKg > 0 ? weightKg : DEFAULT_WEIGHT_KG;
  const totalKcal = sessionExercises.reduce((total, ex) => {
    const minutes = exerciseSeconds(ex) / 60;
    const met = metFor(ex);
    return total + (met * 3.5 * weight * minutes) / 200;
  }, 0);
  return Math.round(totalKcal * 10) / 10;
};

/** Calories estimées à partir du temps réellement passé dans la séance (MET moyen pondéré). */
const estimateCaloriesFromActiveSeconds = (activeSeconds, sessionExercises = [], weightKg) => {
  if (!activeSeconds || activeSeconds <= 0) return 0;
  const weight = weightKg && weightKg > 0 ? weightKg : DEFAULT_WEIGHT_KG;
  let metWeighted = 0;
  let weightSum = 0;
  for (const ex of sessionExercises) {
    const sec = exerciseSeconds(ex);
    if (sec <= 0) continue;
    metWeighted += metFor(ex) * sec;
    weightSum += sec;
  }
  const avgMet = weightSum > 0 ? metWeighted / weightSum : MET_STRENGTH;
  const minutes = activeSeconds / 60;
  return Math.round(((avgMet * 3.5 * weight * minutes) / 200) * 10) / 10;
};

module.exports = {
  DEFAULT_SET_SECONDS,
  estimateSessionDurationSeconds,
  estimateSessionCalories,
  estimateCaloriesFromActiveSeconds,
};