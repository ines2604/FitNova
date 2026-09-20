const pool = require("../config/db");
const { tunisDateTime } = require("../utils/tunisTime");

// Table auto-créée si elle n'existe pas encore (même approche que pour les
// tables `meals`, `favorites` et `progress_photos`, pas d'outil de
// migration séparé dans ce projet).
let tableReady = null;
const ensureTable = async () => {
  if (!tableReady) {
    tableReady = pool.query(`
      CREATE TABLE IF NOT EXISTS fasts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        plan_date DATE NOT NULL,
        planned_start_time TIME NOT NULL,
        planned_end_time TIME NOT NULL,
        duration_hours DECIMAL(4,1) NOT NULL,
        status ENUM('planned','active','completed','cancelled') NOT NULL DEFAULT 'planned',
        actual_start_at DATETIME NULL,
        actual_end_at DATETIME NULL,
        actual_duration_minutes INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_date (user_id, plan_date),
        INDEX idx_user_status (user_id, status)
      )
    `).then(async () => {
      // Les durées décimales fines (ex : 0,05 h = 3 min, utile pour tester)
      // étaient arrondies à 0,1 h par l'ancienne colonne DECIMAL(4,1). On
      // l'élargit à 2 décimales ; l'opération est idempotente.
      try {
        await pool.query(`ALTER TABLE fasts MODIFY duration_hours DECIMAL(5,2) NOT NULL`);
      } catch (error) {
        console.warn("Impossible d'élargir fasts.duration_hours :", error.message);
      }
    });
  }
  return tableReady;
};

// "AAAA-MM-JJ HH:mm:ss" actuel en heure locale de Tunisie — même fuseau que
// celui utilisé par fasting.controller.js pour toutes les comparaisons de
// date/heure de ce module. On compare des chaînes déjà formatées plutôt que
// de s'appuyer sur NOW() côté MySQL, dont le fuseau horaire du serveur peut
// différer.
const nowInTunis = () => tunisDateTime();

// Un jeûne dont l'heure est dépassée sans avoir été terminé doit finir par
// passer automatiquement à "cancelled". Il n'y a pas de tâche planifiée
// (cron) dans ce projet, donc la règle est appliquée à la lecture, avant de
// renvoyer les jeûnes d'un utilisateur.
//
// Deux cas couverts :
//  - "planned" jamais démarré : sa fenêtre prévue (date + heure de fin) est
//    passée -> cancelled (sans horodatage réel, il n'a jamais eu lieu)
//  - "active" jamais terminé (endFast jamais appelé) : on laisse d'abord une
//    marge (OVERTIME_GRACE_MINUTES) après la durée prévue, pendant laquelle
//    le jeûne reste "active" et le bouton « Terminer » est disponible dans
//    l'app. Sans cette marge, le jeûne était annulé à la première lecture
//    suivant la fin prévue, et le statut « Terminé » devenait inatteignable.
//    Passé ce délai, il est annulé en enregistrant la durée prévue (et non le
//    temps écoulé, qui gonflerait les statistiques).
const OVERTIME_GRACE_MINUTES = 12 * 60;

const autoCancelExpired = async (userId) => {
  await ensureTable();
  const now = nowInTunis();

  await pool.query(
    `UPDATE fasts
     SET status = 'cancelled'
     WHERE user_id = ? AND status = 'planned'
       AND TIMESTAMP(
             plan_date + INTERVAL (CASE WHEN planned_end_time < planned_start_time THEN 1 ELSE 0 END) DAY,
             planned_end_time
           ) < ?`,
    [userId, now]
  );

  await pool.query(
    `UPDATE fasts
     SET status = 'cancelled',
         actual_end_at = DATE_ADD(actual_start_at, INTERVAL ROUND(duration_hours * 60) MINUTE),
         actual_duration_minutes = ROUND(duration_hours * 60)
     WHERE user_id = ? AND status = 'active'
       AND actual_start_at IS NOT NULL
       AND DATE_ADD(actual_start_at, INTERVAL ROUND(duration_hours * 60) + ? MINUTE) < ?`,
    [userId, OVERTIME_GRACE_MINUTES, now]
  );
};

const getById = async (userId, id) => {
  await ensureTable();
  const [rows] = await pool.query(
    `SELECT * FROM fasts WHERE id = ? AND user_id = ?`,
    [id, userId]
  );
  return rows[0] || null;
};

// Le jeûne "ouvert" d'un utilisateur : celui actif en priorité, sinon le
// prochain planifié. Utilisé pour l'affichage de la carte "en cours".
const getOpenFast = async (userId) => {
  await ensureTable();
  await autoCancelExpired(userId);
  const [rows] = await pool.query(
    `SELECT * FROM fasts WHERE user_id = ? AND status IN ('planned','active')
     ORDER BY (status = 'active') DESC, plan_date ASC, planned_start_time ASC
     LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
};

// Jeûne planifié/actif existant pour un jour précis. Deux jeûnes ne peuvent
// pas être programmés le même jour, mais rien n'empêche d'en planifier un
// pour un autre jour pendant qu'un autre est en cours (ex : jeûne actif
// aujourd'hui + jeûne planifié pour demain).
const getOpenFastForDate = async (userId, planDate) => {
  await ensureTable();
  // Important ici : sans ce nettoyage, un jeûne expiré resterait "planned"/
  // "active" et bloquerait indéfiniment toute nouvelle planification ce jour-là.
  await autoCancelExpired(userId);
  const [rows] = await pool.query(
    `SELECT * FROM fasts WHERE user_id = ? AND plan_date = ? AND status IN ('planned','active')
     LIMIT 1`,
    [userId, planDate]
  );
  return rows[0] || null;
};

// Historique d'un mois donné, pour l'affichage du calendrier.
const getByMonth = async (userId, year, month) => {
  await ensureTable();
  await autoCancelExpired(userId);
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const [rows] = await pool.query(
    `SELECT * FROM fasts
     WHERE user_id = ? AND plan_date >= ? AND plan_date < DATE_ADD(?, INTERVAL 1 MONTH)
     ORDER BY plan_date ASC, planned_start_time ASC`,
    [userId, start, start]
  );
  return rows;
};

// Historique sur une plage de dates, pour le graphique heures de jeûne / jour.
const getRange = async (userId, startDate, endDate) => {
  await ensureTable();
  await autoCancelExpired(userId);
  const [rows] = await pool.query(
    `SELECT * FROM fasts WHERE user_id = ? AND plan_date BETWEEN ? AND ? ORDER BY plan_date ASC`,
    [userId, startDate, endDate]
  );
  return rows;
};

// Planifie un jeûne à venir (statut "planned", pas encore démarré).
const createPlanned = async (userId, { planDate, startTime, endTime, durationHours }) => {
  await ensureTable();
  const [result] = await pool.query(
    `INSERT INTO fasts (user_id, plan_date, planned_start_time, planned_end_time, duration_hours, status)
     VALUES (?, ?, ?, ?, ?, 'planned')`,
    [userId, planDate, `${startTime}:00`, `${endTime}:00`, durationHours]
  );
  return getById(userId, result.insertId);
};

// Démarre un jeûne immédiatement, sans planification préalable.
const startQuickFast = async (userId, { planDate, startTime, endTime, durationHours }) => {
  await ensureTable();
  const [result] = await pool.query(
    `INSERT INTO fasts (user_id, plan_date, planned_start_time, planned_end_time, duration_hours, status, actual_start_at)
     VALUES (?, ?, ?, ?, ?, 'active', NOW())`,
    [userId, planDate, `${startTime}:00`, `${endTime}:00`, durationHours]
  );
  return getById(userId, result.insertId);
};

// Démarre un jeûne déjà planifié (transition planned -> active).
const startPlannedFast = async (userId, id) => {
  await ensureTable();
  await autoCancelExpired(userId);
  const [result] = await pool.query(
    `UPDATE fasts SET status = 'active', actual_start_at = NOW()
     WHERE id = ? AND user_id = ? AND status = 'planned'`,
    [id, userId]
  );
  if (result.affectedRows === 0) return null;
  return getById(userId, id);
};

// Termine un jeûne actif (transition active -> completed).
const endFast = async (userId, id) => {
  await ensureTable();
  const [result] = await pool.query(
    `UPDATE fasts SET status = 'completed', actual_end_at = NOW(),
     actual_duration_minutes = TIMESTAMPDIFF(MINUTE, actual_start_at, NOW())
     WHERE id = ? AND user_id = ? AND status = 'active'`,
    [id, userId]
  );
  if (result.affectedRows === 0) return null;
  return getById(userId, id);
};

// Annule un jeûne planifié ou actif. Si le jeûne était actif, la durée
// réellement tenue est tout de même enregistrée (pour l'historique/stats).
const cancelFast = async (userId, id) => {
  await ensureTable();
  const fast = await getById(userId, id);
  if (!fast || !["planned", "active"].includes(fast.status)) return null;

  if (fast.status === "active") {
    await pool.query(
      `UPDATE fasts SET status = 'cancelled', actual_end_at = NOW(),
       actual_duration_minutes = TIMESTAMPDIFF(MINUTE, actual_start_at, NOW())
       WHERE id = ? AND user_id = ?`,
      [id, userId]
    );
  } else {
    await pool.query(
      `UPDATE fasts SET status = 'cancelled' WHERE id = ? AND user_id = ?`,
      [id, userId]
    );
  }
  return getById(userId, id);
};

module.exports = {
  ensureTable,
  autoCancelExpired,
  getById,
  getOpenFast,
  getOpenFastForDate,
  getByMonth,
  getRange,
  createPlanned,
  startQuickFast,
  startPlannedFast,
  endFast,
  cancelFast,
};
