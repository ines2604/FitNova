const pool = require("../config/db");

// Récupère (ou crée si absente) la ligne de suivi du jour pour un utilisateur.
// bedtime/wake_time restent NULL tant que l'utilisateur n'a pas explicitement
// enregistré son sommeil (sinon on affichait des heures "aléatoires"
// correspondant simplement au moment de la création de la ligne).
const getOrCreateForDate = async (userId, date) => {
  const [rows] = await pool.query(
    "SELECT * FROM daily_tracking WHERE user_id = ? AND date = ?",
    [userId, date]
  );
  if (rows[0]) return rows[0];

  await pool.query(
    `INSERT INTO daily_tracking (user_id, date) VALUES (?, ?)`,
    [userId, date]
  );
  const [created] = await pool.query(
    "SELECT * FROM daily_tracking WHERE user_id = ? AND date = ?",
    [userId, date]
  );
  return created[0];
};

// Met à jour un ou plusieurs champs de la ligne du jour (upsert simplifié)
const updateFields = async (userId, date, fields) => {
  await getOrCreateForDate(userId, date);

  const keys = Object.keys(fields);
  if (keys.length === 0) return;

  const setClause = keys.map((key) => `${key} = ?`).join(", ");
  const values = keys.map((key) => fields[key]);

  await pool.query(
    `UPDATE daily_tracking SET ${setClause} WHERE user_id = ? AND date = ?`,
    [...values, userId, date]
  );
};

// Incrémente un champ numérique (ex: eau consommée, pas, calories brûlées)
// Un montant négatif permet de retirer/effacer une quantité déjà enregistrée,
// sans jamais faire passer la valeur sous 0.
const incrementField = async (userId, date, field, amount) => {
  await getOrCreateForDate(userId, date);
  await pool.query(
    `UPDATE daily_tracking SET ${field} = GREATEST(0, ${field} + ?) WHERE user_id = ? AND date = ?`,
    [amount, userId, date]
  );
};

const getByDate = async (userId, date) => {
  const [rows] = await pool.query(
    "SELECT * FROM daily_tracking WHERE user_id = ? AND date = ?",
    [userId, date]
  );
  return rows[0];
};

// Récupère les N derniers jours (pour graphiques du tableau de bord)
const getRange = async (userId, startDate, endDate) => {
  const [rows] = await pool.query(
    `SELECT * FROM daily_tracking WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date ASC`,
    [userId, startDate, endDate]
  );
  return rows;
};

module.exports = { getOrCreateForDate, updateFields, incrementField, getByDate, getRange };