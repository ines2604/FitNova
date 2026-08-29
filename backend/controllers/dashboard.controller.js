const dailyTrackingModel = require("../models/dailyTracking.model");
const weightHistoryModel = require("../models/weightBmiHistory.model");
const profileModel = require("../models/profile.model");

// Date du jour en heure locale de Tunisie (identique à tracking/meal.controller).
// Ne JAMAIS utiliser toISOString() ici : ça convertit en UTC et peut faire
// basculer sur la veille entre 00h00 et 00h59 heure de Tunis, ce qui exclut
// la ligne d'aujourd'hui de la plage de dates demandée à la base.
const today = () => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Tunis",
  }).format(new Date());
};

// Formate une date (objet Date ou chaîne SQL) en YYYY-MM-DD en heure locale,
// sans jamais passer par toISOString()/String() qui produisent soit un
// décalage UTC soit un format non standard ("Thu Aug 27 2026 ...").
const formatDateKey = (value) => {
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return String(value).slice(0, 10);
};

// GET /api/dashboard?days=7 — vue d'ensemble : suivi des N derniers jours + progression du poids
const getDashboard = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;

    const end = today();
    const endDate = new Date(`${end}T12:00:00`);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - (days - 1));
    const start = formatDateKey(startDate);

    const [dailyStats, weightProgress, profile] = await Promise.all([
      dailyTrackingModel.getRange(req.user.id, start, end),
      weightHistoryModel.getHistory(req.user.id),
      profileModel.findByUserId(req.user.id),
    ]);

    const enrichedDailyStats = dailyStats
      .map((day) => ({
        date: formatDateKey(day.date),
        water_intake_ml: day.water_intake_ml || 0,
        steps: day.steps || 0,
        calories_burned: day.calories_burned || 0,
        calories_consumed: day.calories_consumed || 0,
        sleep_duration_minutes: day.sleep_duration_minutes || 0,
      }))
      .sort((a, b) => (a.date > b.date ? 1 : -1));

    res.status(200).json({
      goals: {
        dailyCalorieGoal: profile?.daily_calorie_goal,
        dailyWaterGoalMl: profile?.daily_water_goal_ml,
        dailyStepGoal: profile?.daily_step_goal,
      },
      dailyStats: enrichedDailyStats,
      weightProgress,
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

module.exports = { getDashboard };