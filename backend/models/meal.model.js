const pool = require("../config/db");
const dailyTrackingModel = require("./dailyTracking.model");

// La table est créée automatiquement si elle n'existe pas encore, pour
// éviter une étape de migration manuelle séparée (comme pour le reste
// du projet, qui ne dispose pas d'outil de migration).
let tableReady = null;
const ensureTable = async () => {
  if (!tableReady) {
    tableReady = pool.query(`
      CREATE TABLE IF NOT EXISTS meals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        date DATE NOT NULL,
        meal_type ENUM('breakfast','lunch','dinner','snack') NOT NULL,
        name VARCHAR(255) NOT NULL,
        image_url VARCHAR(500) NULL,
        calories INT NOT NULL DEFAULT 0,
        protein DECIMAL(6,1) NULL,
        carbs DECIMAL(6,1) NULL,
        fat DECIMAL(6,1) NULL,
        source ENUM('manual','barcode','photo') NOT NULL DEFAULT 'manual',
        barcode VARCHAR(64) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_date (user_id, date)
      )
    `);
  }
  return tableReady;
};

// Ajoute un repas pour une date donnée et met à jour le total de calories
// consommées du jour dans daily_tracking (source unique de vérité pour le
// nombre de calories restantes affiché sur l'accueil).
const addMeal = async ({
  userId,
  date,
  mealType,
  name,
  imageUrl,
  calories,
  protein,
  carbs,
  fat,
  source,
  barcode,
}) => {
  await ensureTable();

  const [result] = await pool.query(
    `INSERT INTO meals (user_id, date, meal_type, name, image_url, calories, protein, carbs, fat, source, barcode)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      date,
      mealType,
      name,
      imageUrl || null,
      Math.round(calories) || 0,
      protein ?? null,
      carbs ?? null,
      fat ?? null,
      source || "manual",
      barcode || null,
    ]
  );

  await dailyTrackingModel.incrementField(
    userId,
    date,
    "calories_consumed",
    Math.round(calories) || 0
  );

  const [rows] = await pool.query(`SELECT * FROM meals WHERE id = ?`, [
    result.insertId,
  ]);
  return rows[0];
};

const getMealsByDate = async (userId, date) => {
  await ensureTable();
  const [rows] = await pool.query(
    `SELECT * FROM meals WHERE user_id = ? AND date = ? ORDER BY created_at ASC`,
    [userId, date]
  );
  return rows;
};

const getMealById = async (userId, id) => {
  await ensureTable();
  const [rows] = await pool.query(
    `SELECT * FROM meals WHERE id = ? AND user_id = ?`,
    [id, userId]
  );
  return rows[0];
};

// Formate une date en YYYY-MM-DD en heure LOCALE (et non UTC), pour éviter
// que toISOString() ne fasse basculer la date sur la veille quand le
// serveur tourne dans un fuseau horaire en avance sur UTC (ex. Africa/Tunis).
const formatDateLocal = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Supprime un repas et retire ses calories du total du jour.
const deleteMeal = async (userId, id) => {
  await ensureTable();
  const meal = await getMealById(userId, id);
  if (!meal) return null;

  await pool.query(`DELETE FROM meals WHERE id = ? AND user_id = ?`, [
    id,
    userId,
  ]);

  await dailyTrackingModel.incrementField(
    userId,
    meal.date instanceof Date ? formatDateLocal(meal.date) : meal.date,
    "calories_consumed",
    -Math.round(meal.calories || 0)
  );

  return meal;
};

module.exports = { addMeal, getMealsByDate, getMealById, deleteMeal };