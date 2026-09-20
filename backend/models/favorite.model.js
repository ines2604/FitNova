const pool = require("../config/db");

// La table est créée automatiquement si elle n'existe pas encore (même
// approche que pour la table `meals`, pas d'outil de migration séparé).
let tableReady = null;
const ensureTable = async () => {
  if (!tableReady) {
    tableReady = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS favorites (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          item_type ENUM('food','recipe','exercise') NOT NULL,
          ref_id VARCHAR(64) NULL,
          name VARCHAR(255) NOT NULL,
          image_url VARCHAR(500) NULL,
          calories DECIMAL(8,1) NULL,
          protein DECIMAL(6,1) NULL,
          carbs DECIMAL(6,1) NULL,
          fat DECIMAL(6,1) NULL,
          nutri_score VARCHAR(1) NULL,
          source ENUM('aliment','barcode','photo','repas','exercice') NOT NULL DEFAULT 'aliment',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_user (user_id),
          INDEX idx_user_ref (user_id, item_type, ref_id)
        )
      `);

      // Migration : les bases créées avant l'introduction des valeurs
      // "aliment"/"repas" utilisent encore l'ancien ENUM ('search'/'recipe').
      // On élargit temporairement l'ENUM pour accepter les deux jeux de
      // valeurs, on bascule les anciennes lignes, puis on repasse sur
      // l'ENUM final.
      try {
        await pool.query(`
          ALTER TABLE favorites
          MODIFY COLUMN source ENUM('aliment','barcode','photo','repas','exercice','search','recipe')
          NOT NULL DEFAULT 'aliment'
        `);
        await pool.query(`UPDATE favorites SET source = 'aliment' WHERE source = 'search'`);
        await pool.query(`UPDATE favorites SET source = 'repas' WHERE source = 'recipe'`);
        await pool.query(`
          ALTER TABLE favorites
          MODIFY COLUMN source ENUM('aliment','barcode','photo','repas','exercice')
          NOT NULL DEFAULT 'aliment'
        `);
      } catch (migrationError) {
        console.error("Migration favorites.source impossible :", migrationError);
      }

      // Migration : bases créées avant l'ajout du type 'exercise'.
      try {
        await pool.query(`
          ALTER TABLE favorites
          MODIFY COLUMN item_type ENUM('food','recipe','exercise') NOT NULL
        `);
      } catch (migrationError) {
        console.error("Migration favorites.item_type impossible :", migrationError);
      }
    })();
  }
  return tableReady;
};

const getFavorites = async (userId, itemType) => {
  await ensureTable();
  if (itemType) {
    const [rows] = await pool.query(
      `SELECT * FROM favorites WHERE user_id = ? AND item_type = ? ORDER BY created_at DESC`,
      [userId, itemType]
    );
    return rows;
  }
  const [rows] = await pool.query(
    `SELECT * FROM favorites WHERE user_id = ? ORDER BY created_at DESC`,
    [userId]
  );
  return rows;
};

// Recherche une entrée existante par (user, type, ref_id). Utilisé pour
// éviter les doublons et pour vérifier l'état "favori" d'un élément précis.
const findByRef = async (userId, itemType, refId) => {
  await ensureTable();
  if (!refId) return null;
  const [rows] = await pool.query(
    `SELECT * FROM favorites WHERE user_id = ? AND item_type = ? AND ref_id = ? LIMIT 1`,
    [userId, itemType, refId]
  );
  return rows[0] || null;
};

const addFavorite = async ({
  userId,
  itemType,
  refId,
  name,
  imageUrl,
  calories,
  protein,
  carbs,
  fat,
  nutriScore,
  source,
}) => {
  await ensureTable();

  // Idempotent : si l'élément (avec un ref_id défini) est déjà en favoris,
  // on renvoie l'entrée existante plutôt que de créer un doublon.
  const existing = await findByRef(userId, itemType, refId);
  if (existing) return existing;

  const [result] = await pool.query(
    `INSERT INTO favorites (user_id, item_type, ref_id, name, image_url, calories, protein, carbs, fat, nutri_score, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      itemType,
      refId || null,
      name,
      imageUrl || null,
      calories ?? null,
      protein ?? null,
      carbs ?? null,
      fat ?? null,
      nutriScore || null,
      source || "aliment",
    ]
  );

  const [rows] = await pool.query(`SELECT * FROM favorites WHERE id = ?`, [
    result.insertId,
  ]);
  return rows[0];
};

const deleteFavorite = async (userId, id) => {
  await ensureTable();
  const [result] = await pool.query(
    `DELETE FROM favorites WHERE id = ? AND user_id = ?`,
    [id, userId]
  );
  return result.affectedRows > 0;
};

module.exports = { getFavorites, findByRef, addFavorite, deleteFavorite };
