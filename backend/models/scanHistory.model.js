const pool = require("../config/db");

// Ajoute une entrée dans l'historique des repas analysés (photo ou code-barres)
const addRecord = async ({
  userId,
  scanType, // "photo" | "barcode"
  title,
  imageUrl,
  barcode,
  calories,
  protein,
  carbs,
  fat,
  nutriScore,
  confidence,
  details, // objet JS arbitraire (ex: items détectés) -> stocké en JSON
}) => {
  const [result] = await pool.query(
    `INSERT INTO analyzed_meal_history
      (user_id, scan_type, title, image_url, barcode, calories, protein, carbs, fat, nutri_score, confidence, details)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      scanType,
      title,
      imageUrl || null,
      barcode || null,
      calories ?? null,
      protein ?? null,
      carbs ?? null,
      fat ?? null,
      nutriScore || null,
      confidence || null,
      details ? JSON.stringify(details) : null,
    ]
  );

  const [rows] = await pool.query(`SELECT * FROM analyzed_meal_history WHERE id = ?`, [
    result.insertId,
  ]);
  return rows[0];
};

// Récupère l'historique d'un utilisateur, du plus récent au plus ancien.
// `scanType` optionnel permet de filtrer par "photo" ou "barcode".
const getHistory = async (userId, scanType) => {
  if (scanType) {
    const [rows] = await pool.query(
      `SELECT * FROM analyzed_meal_history WHERE user_id = ? AND scan_type = ? ORDER BY created_at DESC`,
      [userId, scanType]
    );
    return rows;
  }
  const [rows] = await pool.query(
    `SELECT * FROM analyzed_meal_history WHERE user_id = ? ORDER BY created_at DESC`,
    [userId]
  );
  return rows;
};

const getById = async (userId, id) => {
  const [rows] = await pool.query(
    `SELECT * FROM analyzed_meal_history WHERE id = ? AND user_id = ?`,
    [id, userId]
  );
  return rows[0];
};

const deleteRecord = async (userId, id) => {
  const [result] = await pool.query(
    `DELETE FROM analyzed_meal_history WHERE id = ? AND user_id = ?`,
    [id, userId]
  );
  return result.affectedRows > 0;
};

module.exports = { addRecord, getHistory, getById, deleteRecord };
