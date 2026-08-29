const pool = require("../config/db");

// Créer le profil d'un utilisateur (une seule fois, après inscription)
const createProfile = async (userId, data) => {
  const {
    age, gender, heightCm, weightKg, activityLevel, goal,
    dailyCalorieGoal, dailyWaterGoalMl, dailyStepGoal,
  } = data;

  const [result] = await pool.query(
    `INSERT INTO profiles
     (user_id, age, gender, height_cm, weight_kg, activity_level, goal, daily_calorie_goal, daily_water_goal_ml, daily_step_goal)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, age, gender, heightCm, weightKg, activityLevel, goal, dailyCalorieGoal, dailyWaterGoalMl, dailyStepGoal]
  );
  return { id: result.insertId, userId, ...data };
};

const findByUserId = async (userId) => {
  const [rows] = await pool.query("SELECT * FROM profiles WHERE user_id = ?", [userId]);
  return rows[0];
};

const updateProfile = async (userId, data) => {
  const {
    age, gender, heightCm, weightKg, activityLevel, goal,
    dailyCalorieGoal, dailyWaterGoalMl, dailyStepGoal,
  } = data;

  await pool.query(
    `UPDATE profiles SET age = ?, gender = ?, height_cm = ?, weight_kg = ?, activity_level = ?,
     goal = ?, daily_calorie_goal = ?, daily_water_goal_ml = ?, daily_step_goal = ?
     WHERE user_id = ?`,
    [age, gender, heightCm, weightKg, activityLevel, goal, dailyCalorieGoal, dailyWaterGoalMl, dailyStepGoal, userId]
  );
};

module.exports = { createProfile, findByUserId, updateProfile };