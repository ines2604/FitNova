const pool = require("../config/db");

// Table auto-créée si elle n'existe pas encore (même approche que pour la
// table `favorites`).
let tableReady = null;
const ensureTable = async () => {
  if (!tableReady) {
    tableReady = pool.query(`
      CREATE TABLE IF NOT EXISTS progress_photos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        image_url VARCHAR(500) NOT NULL,
        weight_kg DECIMAL(6,1) NULL,
        photo_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_date (user_id, photo_date)
      )
    `);
  }
  return tableReady;
};

// Ajoute une photo de progression pour l'utilisateur.
const addPhoto = async ({ userId, imageUrl, weightKg, photoDate }) => {
  await ensureTable();

  const [result] = await pool.query(
    `INSERT INTO progress_photos (user_id, image_url, weight_kg, photo_date)
     VALUES (?, ?, ?, ?)`,
    [userId, imageUrl, weightKg ?? null, photoDate]
  );

  const [rows] = await pool.query(`SELECT * FROM progress_photos WHERE id = ?`, [
    result.insertId,
  ]);
  return rows[0];
};

// Historique des photos d'un utilisateur, de la plus récente à la plus ancienne.
const getHistory = async (userId) => {
  await ensureTable();
  const [rows] = await pool.query(
    `SELECT * FROM progress_photos WHERE user_id = ? ORDER BY photo_date DESC, created_at DESC`,
    [userId]
  );
  return rows;
};

const getById = async (userId, id) => {
  await ensureTable();
  const [rows] = await pool.query(
    `SELECT * FROM progress_photos WHERE id = ? AND user_id = ?`,
    [id, userId]
  );
  return rows[0] || null;
};

const deletePhoto = async (userId, id) => {
  await ensureTable();
  const [result] = await pool.query(
    `DELETE FROM progress_photos WHERE id = ? AND user_id = ?`,
    [id, userId]
  );
  return result.affectedRows > 0;
};

module.exports = { getHistory, getById, addPhoto, deletePhoto };