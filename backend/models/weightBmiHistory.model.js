const pool = require("../config/db");

// Ajouter une entrée dans l'historique poids/IMC
const addRecord = async (userId, weightKg, bmi, category, recordDate) => {
  const [result] = await pool.query(
    `INSERT INTO weight_bmi_history (user_id, weight_kg, bmi, category, record_date)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, weightKg, bmi, category, recordDate]
  );
  return { id: result.insertId, userId, weightKg, bmi, category, recordDate };
};

// Récupérer l'historique complet, du plus récent au plus ancien
const getHistory = async (userId) => {
  const [rows] = await pool.query(
    `SELECT * FROM weight_bmi_history WHERE user_id = ? ORDER BY record_date DESC`,
    [userId]
  );
  return rows;
};

module.exports = { addRecord, getHistory };