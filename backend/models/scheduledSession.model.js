const pool = require("../config/db");
const workoutSessionModel = require("./workoutSession.model");
const profileModel = require("./profile.model");
const dailyTrackingModel = require("./dailyTracking.model");
const {
  estimateCaloriesFromActiveSeconds,
} = require("../utils/workoutCalories");
const { tunisDate, tunisTime, parseTunisDateTime } = require("../utils/tunisTime");

let tableReady = null;
const ensureTable = async () => {
  if (!tableReady) {
    tableReady = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS scheduled_sessions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          session_id INT NOT NULL,
          scheduled_date DATE NOT NULL,
          scheduled_time TIME NOT NULL,
          status ENUM('planned','in_progress','paused','completed','cancelled','missed') NOT NULL DEFAULT 'planned',
          started_at DATETIME NULL,
          ended_at DATETIME NULL,
          calories_burned DECIMAL(6,1) NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          -- Contrainte demandée : un seul créneau par jour/heure pour un même utilisateur.
          UNIQUE KEY uniq_user_slot (user_id, scheduled_date, scheduled_time),
          INDEX idx_user_date (user_id, scheduled_date)
        )
      `);
      const [durationCol] = await pool.query(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'scheduled_sessions'
           AND COLUMN_NAME = 'actual_duration_seconds'`
      );
      if (durationCol.length === 0) {
        await pool.query(
          `ALTER TABLE scheduled_sessions
           ADD COLUMN actual_duration_seconds INT UNSIGNED NULL AFTER ended_at`
        );
      }
    })();
  }
  return tableReady;
};

const DUPLICATE_SLOT = "DUPLICATE_SLOT";
const NOT_FOUND = "NOT_FOUND";
const INVALID_STATUS = "INVALID_STATUS";

// Séances planifiées dont l'heure de début est passée sans avoir été démarrées,
// ou encore « ouvertes » (en cours / pause) sur un jour antérieur → annulées auto.
const expireOverdueSessions = async (userId) => {
  await ensureTable();
  await pool.query(
    `UPDATE scheduled_sessions
     SET status = 'cancelled', ended_at = COALESCE(ended_at, NOW())
     WHERE user_id = ?
       AND status = 'planned'
       AND TIMESTAMP(scheduled_date, scheduled_time) < NOW()`,
    [userId]
  );
  await pool.query(
    `UPDATE scheduled_sessions
     SET status = 'cancelled', ended_at = COALESCE(ended_at, NOW())
     WHERE user_id = ?
       AND status IN ('in_progress', 'paused')
       AND scheduled_date < CURDATE()`,
    [userId]
  );
};

const findOwned = async (userId, id) => {
  const [rows] = await pool.query(
    `SELECT ss.*, ws.name AS session_name
     FROM scheduled_sessions ss
     JOIN workout_sessions ws ON ws.id = ss.session_id
     WHERE ss.id = ? AND ss.user_id = ?`,
    [id, userId]
  );
  return rows[0] || null;
};

// POST /api/calendar — planifier une séance à une date/heure donnée.
// Renvoie { error: DUPLICATE_SLOT } si un créneau existe déjà à cette date/heure.
const schedule = async (userId, { sessionId, date, time }) => {
  await ensureTable();
  try {
    const [result] = await pool.query(
      `INSERT INTO scheduled_sessions (user_id, session_id, scheduled_date, scheduled_time, status)
       VALUES (?, ?, ?, ?, 'planned')`,
      [userId, sessionId, date, time]
    );
    return findOwned(userId, result.insertId);
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return { error: DUPLICATE_SLOT };
    }
    throw error;
  }
};

// POST /api/calendar/start-now — démarre une séance qui n'était pas planifiée :
// on l'enregistre dans le calendrier à la date/heure courante, déjà "en cours".
const startNow = async (userId, sessionId) => {
  await ensureTable();
  // Date et heure de Tunisie (toISOString() donnerait la date UTC et
  // toTimeString() l'heure du serveur, pas celle de la Tunisie).
  const date = tunisDate();
  const time = tunisTime();

  try {
    const [result] = await pool.query(
      `INSERT INTO scheduled_sessions (user_id, session_id, scheduled_date, scheduled_time, status, started_at)
       VALUES (?, ?, ?, ?, 'in_progress', NOW())`,
      [userId, sessionId, date, time]
    );
    return findOwned(userId, result.insertId);
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return { error: DUPLICATE_SLOT };
    }
    throw error;
  }
};

// GET /api/calendar?from=&to= — vue calendrier (toutes les séances planifiées sur une période)
const getCalendar = async (userId, { from, to } = {}) => {
  await ensureTable();
  await expireOverdueSessions(userId);
  const where = ["ss.user_id = ?"];
  const params = [userId];
  if (from) {
    where.push("ss.scheduled_date >= ?");
    params.push(from);
  }
  if (to) {
    where.push("ss.scheduled_date <= ?");
    params.push(to);
  }
  const [rows] = await pool.query(
    `SELECT ss.*, ws.name AS session_name
     FROM scheduled_sessions ss
     JOIN workout_sessions ws ON ws.id = ss.session_id
     WHERE ${where.join(" AND ")}
     ORDER BY ss.scheduled_date ASC, ss.scheduled_time ASC`,
    params
  );
  return rows;
};

// GET /api/calendar/history?from=&to=&status=
const getHistory = async (userId, { from, to, status } = {}) => {
  await ensureTable();
  await expireOverdueSessions(userId);
  const where = ["ss.user_id = ?"];
  const params = [userId];
  if (from) {
    where.push("ss.scheduled_date >= ?");
    params.push(from);
  }
  if (to) {
    where.push("ss.scheduled_date <= ?");
    params.push(to);
  }
  if (status) {
    where.push("ss.status = ?");
    params.push(status);
  } else {
    // Par défaut, l'historique montre les séances déjà "jouées" (pas les planifications à venir).
    where.push("ss.status IN ('completed','cancelled','missed')");
  }
  const [rows] = await pool.query(
    `SELECT ss.*, ws.name AS session_name,
            TIMESTAMPDIFF(MINUTE, ss.started_at, ss.ended_at) AS duration_minutes
     FROM scheduled_sessions ss
     JOIN workout_sessions ws ON ws.id = ss.session_id
     WHERE ${where.join(" AND ")}
     ORDER BY ss.scheduled_date DESC, ss.scheduled_time DESC`,
    params
  );
  return rows;
};

// Minutes réellement passées en séance, agrégées par jour (séances terminées
// ou annulées après démarrage). Sert au graphique du profil.
const getDurationStats = async (userId, from, to) => {
  await ensureTable();
  const [rows] = await pool.query(
    `SELECT scheduled_date AS date,
            CAST(ROUND(SUM(
              COALESCE(
                actual_duration_seconds,
                IF(started_at IS NOT NULL AND ended_at IS NOT NULL,
                   TIMESTAMPDIFF(SECOND, started_at, ended_at),
                   0)
              )
            ) / 60) AS UNSIGNED) AS minutes
     FROM scheduled_sessions
     WHERE user_id = ?
       AND scheduled_date BETWEEN ? AND ?
       AND status IN ('completed', 'cancelled')
     GROUP BY scheduled_date
     HAVING minutes > 0
     ORDER BY scheduled_date ASC`,
    [userId, from, to]
  );
  return rows;
};

const getById = async (userId, id) => {
  await ensureTable();
  await expireOverdueSessions(userId);
  return findOwned(userId, id);
};

// PATCH /api/calendar/:id/start — démarre (ou reprend depuis une pause) une séance planifiée.
const start = async (userId, id) => {
  await ensureTable();
  await expireOverdueSessions(userId);
  const entry = await findOwned(userId, id);
  if (!entry) return { error: NOT_FOUND };
  if (!["planned", "paused"].includes(entry.status)) return { error: INVALID_STATUS };

  await pool.query(
    `UPDATE scheduled_sessions SET status = 'in_progress', started_at = COALESCE(started_at, NOW()) WHERE id = ?`,
    [id]
  );
  return findOwned(userId, id);
};

// PATCH /api/calendar/:id/pause
const pause = async (userId, id) => {
  await ensureTable();
  const entry = await findOwned(userId, id);
  if (!entry) return { error: NOT_FOUND };
  if (entry.status !== "in_progress") return { error: INVALID_STATUS };

  await pool.query(`UPDATE scheduled_sessions SET status = 'paused' WHERE id = ?`, [id]);
  return findOwned(userId, id);
};

const resolveWorkoutStats = async (userId, entry, actualDurationSeconds) => {
  const sessionExercises = await workoutSessionModel.getSessionExercises(entry.session_id);
  const profile = await profileModel.findByUserId(userId);

  let durationSec = Number(actualDurationSeconds);
  if (!Number.isFinite(durationSec) || durationSec < 0) {
    const startedAt = parseTunisDateTime(entry.started_at);
    if (startedAt) {
      durationSec = Math.max(
        0,
        Math.floor((Date.now() - startedAt.getTime()) / 1000)
      );
    } else {
      durationSec = 0;
    }
  }

  const calories = estimateCaloriesFromActiveSeconds(
    durationSec,
    sessionExercises,
    profile ? profile.weight_kg : null
  );
  return { durationSec, calories };
};

const toDateKey = (value) => String(value).slice(0, 10);

const sumCaloriesBurnedForDate = async (userId, date) => {
  await ensureTable();
  const [rows] = await pool.query(
    `SELECT COALESCE(SUM(calories_burned), 0) AS total
     FROM scheduled_sessions
     WHERE user_id = ? AND scheduled_date = ? AND calories_burned IS NOT NULL`,
    [userId, toDateKey(date)]
  );
  return Number(rows[0]?.total) || 0;
};

// calories_burned du daily_tracking = calories d'activité (pas / Health Connect)
// + calories sport du même jour. On SET le total pour que le sync des pas
// n'écrase pas les kcal des séances.
const syncDailyCaloriesBurned = async (userId, date, activityCalories) => {
  const dateKey = toDateKey(date);
  const workout = await sumCaloriesBurnedForDate(userId, dateKey);
  const activity = Number(activityCalories);
  const activitySafe = Number.isFinite(activity) && activity > 0 ? activity : 0;
  await dailyTrackingModel.updateFields(userId, dateKey, {
    calories_burned: Math.round((activitySafe + workout) * 10) / 10,
  });
};

const addCaloriesToDailyTracking = async (userId, entry, sessionCalories) => {
  const dateKey = toDateKey(entry.scheduled_date);
  const tracking = await dailyTrackingModel.getOrCreateForDate(userId, dateKey);
  const workoutTotal = await sumCaloriesBurnedForDate(userId, dateKey);
  const sessionKcal = Number(sessionCalories) || 0;
  const otherWorkouts = Math.max(0, workoutTotal - sessionKcal);
  const stored = Number(tracking.calories_burned) || 0;
  const activity = Math.max(0, stored - otherWorkouts);
  await dailyTrackingModel.updateFields(userId, dateKey, {
    calories_burned: Math.round((activity + workoutTotal) * 10) / 10,
  });
};

// PATCH /api/calendar/:id/cancel
// Si la séance a déjà commencé, on conserve la durée réelle et les kcal estimées.
const cancel = async (userId, id, { actualDurationSeconds } = {}) => {
  await ensureTable();
  const entry = await findOwned(userId, id);
  if (!entry) return { error: NOT_FOUND };
  if (["completed", "cancelled"].includes(entry.status)) return { error: INVALID_STATUS };

  const started = ["in_progress", "paused"].includes(entry.status);
  if (started) {
    const { durationSec, calories } = await resolveWorkoutStats(
      userId,
      entry,
      actualDurationSeconds
    );
    await pool.query(
      `UPDATE scheduled_sessions
       SET status = 'cancelled', ended_at = NOW(), actual_duration_seconds = ?, calories_burned = ?
       WHERE id = ?`,
      [durationSec, calories, id]
    );
    await addCaloriesToDailyTracking(userId, entry, calories);
  } else {
    await pool.query(
      `UPDATE scheduled_sessions SET status = 'cancelled', ended_at = NOW() WHERE id = ?`,
      [id]
    );
  }
  return findOwned(userId, id);
};

// PATCH /api/calendar/:id/finish — termine la séance : calcule les calories
// brûlées (estimation MET) et les ajoute aux calories brûlées du jour de
// l'utilisateur (daily_tracking), sans écraser ce qui y était déjà.
const finish = async (userId, id, { actualDurationSeconds } = {}) => {
  await ensureTable();
  const entry = await findOwned(userId, id);
  if (!entry) return { error: NOT_FOUND };
  if (!["in_progress", "paused"].includes(entry.status)) return { error: INVALID_STATUS };

  const { durationSec, calories } = await resolveWorkoutStats(
    userId,
    entry,
    actualDurationSeconds
  );

  await pool.query(
    `UPDATE scheduled_sessions
     SET status = 'completed', ended_at = NOW(), actual_duration_seconds = ?, calories_burned = ?
     WHERE id = ?`,
    [durationSec, calories, id]
  );

  await addCaloriesToDailyTracking(userId, entry, calories);

  return findOwned(userId, id);
};

// DELETE /api/calendar/:id — retire une entrée du calendrier (avant qu'elle n'ait lieu)
const remove = async (userId, id) => {
  await ensureTable();
  const entry = await findOwned(userId, id);
  if (!entry) return false;
  await pool.query(`DELETE FROM scheduled_sessions WHERE id = ?`, [id]);
  return true;
};

module.exports = {
  ensureTable,
  schedule,
  startNow,
  getCalendar,
  getHistory,
  getDurationStats,
  getById,
  start,
  pause,
  cancel,
  finish,
  remove,
  sumCaloriesBurnedForDate,
  syncDailyCaloriesBurned,
  DUPLICATE_SLOT,
  NOT_FOUND,
  INVALID_STATUS,
};
