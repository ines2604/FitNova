const pool = require("../config/db");

// Compteur d'essais de saisie de code OTP, par utilisateur ET par type de code
// (email_verification / password_reset).
//
// Le compteur est rattaché à l'utilisateur et non au code OTP : sinon il
// suffirait de demander un nouveau code (« Renvoyer ») pour repartir de zéro.
//
// Les instants sont stockés en millisecondes (BIGINT) et non en DATETIME : le
// calcul ne dépend ainsi d'aucun fuseau horaire.
let tableReady = null;
const ensureTable = async () => {
  if (!tableReady) {
    tableReady = pool
      .query(
        `CREATE TABLE IF NOT EXISTS otp_attempts (
          user_id INT NOT NULL,
          type VARCHAR(32) NOT NULL,
          attempts INT NOT NULL DEFAULT 0,
          window_start_ms BIGINT NOT NULL,
          PRIMARY KEY (user_id, type)
        )`
      )
      .catch((error) => {
        tableReady = null; // permet de réessayer au prochain appel
        throw error;
      });
  }
  return tableReady;
};

// Enregistre UN essai (avant même de regarder si le code est bon) et renvoie
// le nombre d'essais de la période en cours, y compris celui-ci.
//
// Tout se fait dans une seule requête SQL atomique : si quelqu'un envoie 50
// requêtes en parallèle, chacune reçoit son propre numéro d'essai (1, 2, 3…).
// Un « lire puis écrire » en JavaScript laisserait passer toutes les requêtes
// simultanées.
//  - MySQL évalue les affectations de ON DUPLICATE KEY UPDATE de gauche à
//    droite : `attempts` est donc calculé avec l'ancienne `window_start_ms`.
//  - LAST_INSERT_ID(expr) renvoie la nouvelle valeur du compteur à CETTE
//    connexion (result.insertId), sans relire la table (donc sans être
//    perturbé par les autres requêtes en cours).
//  - Période expirée -> le compteur repart à 1 et une nouvelle période commence.
//  - Première ligne créée : le INSERT ne renseigne pas insertId (0), le
//    compteur vaut donc 1.
const registerAttempt = async (userId, type, windowMs) => {
  await ensureTable();
  const now = Date.now();

  const [result] = await pool.query(
    `INSERT INTO otp_attempts (user_id, type, attempts, window_start_ms)
     VALUES (?, ?, 1, ?)
     ON DUPLICATE KEY UPDATE
       attempts = LAST_INSERT_ID(IF(? - window_start_ms >= ?, 1, attempts + 1)),
       window_start_ms = IF(? - window_start_ms >= ?, ?, window_start_ms)`,
    [userId, type, now, now, windowMs, now, windowMs, now]
  );
  const attempts = Number(result.insertId) || 1;

  const [rows] = await pool.query(
    `SELECT window_start_ms FROM otp_attempts WHERE user_id = ? AND type = ?`,
    [userId, type]
  );
  const windowStart = rows[0] ? Number(rows[0].window_start_ms) : now;
  const retryAfterMs = Math.max(0, windowStart + windowMs - now);

  return { attempts, retryAfterMs };
};

// Code correct : on repart de zéro.
const resetAttempts = async (userId, type) => {
  await ensureTable();
  await pool.query(`DELETE FROM otp_attempts WHERE user_id = ? AND type = ?`, [
    userId,
    type,
  ]);
};

module.exports = { registerAttempt, resetAttempts };
