const profileModel = require("../models/profile.model");
const weightHistoryModel = require("../models/weightBmiHistory.model");
const { calculateBmi, getBmiCategory } = require("../services/bmi.service");
const { suggestDailyCalorieGoal } = require("../services/calorieGoal.service");

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number(fallback);
};

const mergeProfileData = (existing, body) => ({
  age: toNumber(body.age, existing.age),
  gender: body.gender ?? existing.gender,
  heightCm: toNumber(body.heightCm, existing.height_cm),
  weightKg: toNumber(body.weightKg, existing.weight_kg),
  activityLevel: body.activityLevel ?? existing.activity_level,
  goal: body.goal ?? existing.goal,
  dailyWaterGoalMl: toNumber(body.dailyWaterGoalMl, existing.daily_water_goal_ml ?? 2000),
  dailyStepGoal: toNumber(body.dailyStepGoal, existing.daily_step_goal ?? 10000),
});

// POST /api/profile — création du profil juste après l'inscription
const createProfile = async (req, res) => {
  try {
    const { age, gender, heightCm, weightKg, activityLevel, goal, dailyWaterGoalMl, dailyStepGoal } = req.body;

    const existing = await profileModel.findByUserId(req.user.id);
    if (existing) return res.status(409).json({ message: "Le profil existe déjà" });

    const merged = mergeProfileData(
      {
        age: 0,
        gender: null,
        height_cm: 0,
        weight_kg: 0,
        activity_level: null,
        goal: null,
        daily_water_goal_ml: 2000,
        daily_step_goal: 10000,
      },
      { age, gender, heightCm, weightKg, activityLevel, goal, dailyWaterGoalMl, dailyStepGoal }
    );

    const dailyCalorieGoal = suggestDailyCalorieGoal({
      age: merged.age,
      gender: merged.gender,
      heightCm: merged.heightCm,
      weightKg: merged.weightKg,
      activityLevel: merged.activityLevel,
      goal: merged.goal,
    });

    const profile = await profileModel.createProfile(req.user.id, {
      ...merged,
      dailyCalorieGoal,
    });

    // Premier relevé de poids/IMC
    const bmi = calculateBmi(merged.weightKg, merged.heightCm);
    await weightHistoryModel.addRecord(
      req.user.id,
      merged.weightKg,
      bmi,
      getBmiCategory(bmi),
      new Date()
    );

    res.status(201).json(profile);
  } catch (error) {
    res.status(500).json({
      message: error.message || "Erreur serveur",
      error: error.message,
    });
  }
};

// GET /api/profile — profil + IMC + catégorie
const getProfile = async (req, res) => {
  try {
    const profile = await profileModel.findByUserId(req.user.id);
    if (!profile) return res.status(404).json({ message: "Profil introuvable" });

    const bmi = calculateBmi(profile.weight_kg, profile.height_cm);

    res.status(200).json({ ...profile, bmi, bmiCategory: getBmiCategory(bmi) });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// PUT /api/profile — mise à jour des infos du profil
const updateProfile = async (req, res) => {
  try {
    const existing = await profileModel.findByUserId(req.user.id);
    if (!existing) return res.status(404).json({ message: "Profil introuvable" });

    const { age, gender, heightCm, weightKg, activityLevel, goal, dailyWaterGoalMl, dailyStepGoal } = req.body;

    const merged = mergeProfileData(existing, {
      age,
      gender,
      heightCm,
      weightKg,
      activityLevel,
      goal,
      dailyWaterGoalMl,
      dailyStepGoal,
    });

    const dailyCalorieGoal = suggestDailyCalorieGoal({
      age: merged.age,
      gender: merged.gender,
      heightCm: merged.heightCm,
      weightKg: merged.weightKg,
      activityLevel: merged.activityLevel,
      goal: merged.goal,
    });

    await profileModel.updateProfile(req.user.id, {
      ...merged,
      dailyCalorieGoal,
    });

    if (weightKg && Number(weightKg) !== Number(existing.weight_kg)) {
      const bmi = calculateBmi(merged.weightKg, merged.heightCm);
      await weightHistoryModel.addRecord(
        req.user.id,
        merged.weightKg,
        bmi,
        getBmiCategory(bmi),
        new Date()
      );
    }

    const updated = await profileModel.findByUserId(req.user.id);
    const bmi = calculateBmi(updated.weight_kg, updated.height_cm);

    res.status(200).json({ ...updated, bmi, bmiCategory: getBmiCategory(bmi) });
  } catch (error) {
    res.status(500).json({
      message: error.message || "Erreur serveur",
      error: error.message,
    });
  }
};

// GET /api/profile/weight-history — historique poids/IMC (pour la courbe de progression)
const getWeightHistory = async (req, res) => {
  try {
    res.status(200).json(await weightHistoryModel.getHistory(req.user.id));
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

module.exports = { createProfile, getProfile, updateProfile, getWeightHistory };