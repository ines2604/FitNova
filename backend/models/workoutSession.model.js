const pool = require("../config/db");
const { DEFAULT_SET_SECONDS } = require("../utils/workoutCalories");
const { mediaUrl } = require("../utils/exerciseMedia");

// Tables auto-créées si absentes (même approche que le reste de l'app : pas
// d'outil de migration séparé, le model garantit le schéma au démarrage).
let tableReady = null;
const ensureTable = async () => {
  if (!tableReady) {
    tableReady = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS workout_sessions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          name VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_user (user_id),
          INDEX idx_user_name (user_id, name)
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS session_exercises (
          id INT AUTO_INCREMENT PRIMARY KEY,
          session_id INT NOT NULL,
          exercise_id VARCHAR(10) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
          order_index INT NOT NULL DEFAULT 0,
          sets INT NOT NULL DEFAULT 3,
          duration_seconds INT NULL,
          rest_seconds INT NOT NULL DEFAULT 60,
          INDEX idx_session (session_id, order_index)
        )
      `);

      // exercise_id référence désormais l'id texte du dataset ("0025"). Si la
      // table date de l'ancien schéma (INT), on demande d'exécuter le script
      // de migration plutôt que de convertir les données silencieusement.
      const [columns] = await pool.query(
        `SELECT DATA_TYPE FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'session_exercises'
           AND COLUMN_NAME = 'exercise_id'`
      );
      const dataType = columns[0] && (columns[0].DATA_TYPE || columns[0].data_type);
      if (dataType && dataType.toLowerCase().includes("int")) {
        throw new Error(
          "session_exercises.exercise_id est encore de type INT (ancien catalogue). " +
            "Exécute une fois backend/scripts/migrate_exercises_dataset.sql puis relance le serveur."
        );
      }
    })().catch((error) => {
      tableReady = null; // permet de réessayer après correction
      throw error;
    });
  }
  return tableReady;
};

// Les ids du dataset sont des textes sur 4 chiffres ("0025"). On normalise
// aussi un id numérique (25) pour ne pas perdre les zéros initiaux.
const toExerciseId = (value) => {
  const id = String(value).trim();
  return /^\d+$/.test(id) ? id.padStart(4, "0") : id;
};

// Vérifie que la séance appartient bien à l'utilisateur avant toute
// lecture/écriture ciblée. Retourne la séance (sans ses exercices) ou null.
const findOwnedSession = async (userId, sessionId) => {
  const [rows] = await pool.query(
    `SELECT * FROM workout_sessions WHERE id = ? AND user_id = ?`,
    [sessionId, userId]
  );
  return rows[0] || null;
};

const getSessionExercises = async (sessionId) => {
  const [rows] = await pool.query(
    `SELECT se.id, se.session_id, se.exercise_id, se.order_index, se.sets,
            se.duration_seconds, se.rest_seconds,
            e.name AS exercise_name, e.image, e.body_part, e.equipment
     FROM session_exercises se
     JOIN exercises e ON e.id = se.exercise_id
     WHERE se.session_id = ?
     ORDER BY se.order_index ASC`,
    [sessionId]
  );
  return rows.map((row) => ({ ...row, image: mediaUrl(row.image) }));
};

// POST /api/sessions
// exercises: [{ exerciseId, sets, durationSeconds, restSeconds }] dans l'ordre voulu
const createSession = async (userId, name, exercises = []) => {
  await ensureTable();
  const [result] = await pool.query(
    `INSERT INTO workout_sessions (user_id, name) VALUES (?, ?)`,
    [userId, name]
  );
  const sessionId = result.insertId;

  for (let i = 0; i < exercises.length; i++) {
    const ex = exercises[i];
    await pool.query(
      `INSERT INTO session_exercises (session_id, exercise_id, order_index, sets, duration_seconds, rest_seconds)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        sessionId,
        toExerciseId(ex.exerciseId),
        i,
        ex.sets ?? 3,
        ex.durationSeconds ?? 60,
        ex.restSeconds ?? 60,
      ]
    );
  }

  return getSessionById(userId, sessionId);
};

// Durée totale estimée d'une séance (en secondes), calculée à la volée à
// partir de ses exercices : pour chaque exercice, séries × (durée d'une série
// + repos). Si l'exercice n'a pas de durée (exercice compté en répétitions),
// on retient DEFAULT_SET_SECONDS par série. C'est exactement la formule de
// estimateSessionDurationSeconds() (utils/workoutCalories.js), donc la durée
// affichée dans la liste correspond à celle utilisée pour les calories.
// Elle n'est pas stockée en base : ainsi elle reste toujours juste quand les
// exercices d'une séance sont ajoutés, retirés ou modifiés.
// (Le CASE évite de compter une durée fantôme pour une séance sans exercice :
// dans ce cas le LEFT JOIN renvoie une ligne dont tous les champs sont NULL.)
const TOTAL_DURATION_SQL = `CAST(COALESCE(SUM(
  CASE WHEN se.id IS NULL THEN 0 ELSE
    COALESCE(NULLIF(se.sets, 0), 1) *
    (COALESCE(NULLIF(se.duration_seconds, 0), ${Number(DEFAULT_SET_SECONDS)}) + COALESCE(se.rest_seconds, 0))
  END
), 0) AS UNSIGNED)`;

// Tris autorisés pour GET /api/sessions (liste blanche : la valeur reçue du
// client n'est jamais insérée telle quelle dans la requête SQL).
const SESSION_SORTS = {
  recent: "ws.updated_at DESC, ws.id DESC",
  duration_asc: "total_duration_seconds ASC, ws.updated_at DESC",
  duration_desc: "total_duration_seconds DESC, ws.updated_at DESC",
};

const resolveSessionSort = (sort) =>
  typeof sort === "string" && Object.prototype.hasOwnProperty.call(SESSION_SORTS, sort)
    ? SESSION_SORTS[sort]
    : SESSION_SORTS.recent;

// GET /api/sessions?q=&sort=recent|duration_asc|duration_desc
const getSessions = async (userId, q, sort) => {
  await ensureTable();
  const where = ["ws.user_id = ?"];
  const params = [userId];
  if (q) {
    where.push("ws.name LIKE ?");
    params.push(`%${q}%`);
  }
  const [rows] = await pool.query(
    `SELECT ws.id, ws.name, ws.created_at, ws.updated_at,
            COUNT(se.id) AS exercise_count,
            ${TOTAL_DURATION_SQL} AS total_duration_seconds
     FROM workout_sessions ws
     LEFT JOIN session_exercises se ON se.session_id = ws.id
     WHERE ${where.join(" AND ")}
     GROUP BY ws.id
     ORDER BY ${resolveSessionSort(sort)}`,
    params
  );
  return rows.map((row) => ({
    ...row,
    exercise_count: Number(row.exercise_count),
    total_duration_seconds: Number(row.total_duration_seconds),
  }));
};

// GET /api/sessions/:id
const getSessionById = async (userId, sessionId) => {
  await ensureTable();
  const session = await findOwnedSession(userId, sessionId);
  if (!session) return null;
  const exercises = await getSessionExercises(sessionId);
  return { ...session, exercises };
};

// PUT /api/sessions/:id (renommer)
const renameSession = async (userId, sessionId, name) => {
  await ensureTable();
  const session = await findOwnedSession(userId, sessionId);
  if (!session) return null;
  await pool.query(`UPDATE workout_sessions SET name = ? WHERE id = ?`, [name, sessionId]);
  return getSessionById(userId, sessionId);
};

// POST /api/sessions/:id/exercises — ajoute un exercice à la fin de la séance
const addExercise = async (userId, sessionId, { exerciseId, sets, durationSeconds, restSeconds }) => {
  await ensureTable();
  const session = await findOwnedSession(userId, sessionId);
  if (!session) return null;

  const [[{ maxOrder }]] = await pool.query(
    `SELECT COALESCE(MAX(order_index), -1) AS maxOrder FROM session_exercises WHERE session_id = ?`,
    [sessionId]
  );

  await pool.query(
    `INSERT INTO session_exercises (session_id, exercise_id, order_index, sets, duration_seconds, rest_seconds)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [sessionId, toExerciseId(exerciseId), maxOrder + 1, sets ?? 3, durationSeconds ?? 60, restSeconds ?? 60]
  );

  return getSessionById(userId, sessionId);
};

// DELETE /api/sessions/:id/exercises/:sessionExerciseId
const removeExercise = async (userId, sessionId, sessionExerciseId) => {
  await ensureTable();
  const session = await findOwnedSession(userId, sessionId);
  if (!session) return null;
  await pool.query(
    `DELETE FROM session_exercises WHERE id = ? AND session_id = ?`,
    [sessionExerciseId, sessionId]
  );
  return getSessionById(userId, sessionId);
};

// PATCH /api/sessions/:id/exercises/:sessionExerciseId
// Modifie librement sets / durée / repos d'un exercice de la séance (un seul
// champ ou plusieurs à la fois).
const updateExercise = async (userId, sessionId, sessionExerciseId, { sets, durationSeconds, restSeconds }) => {
  await ensureTable();
  const session = await findOwnedSession(userId, sessionId);
  if (!session) return null;

  const fields = [];
  const params = [];
  if (sets !== undefined) {
    fields.push("sets = ?");
    params.push(sets);
  }
  if (durationSeconds !== undefined) {
    fields.push("duration_seconds = ?");
    params.push(durationSeconds);
  }
  if (restSeconds !== undefined) {
    fields.push("rest_seconds = ?");
    params.push(restSeconds);
  }
  if (fields.length === 0) return getSessionById(userId, sessionId);

  params.push(sessionExerciseId, sessionId);
  await pool.query(
    `UPDATE session_exercises SET ${fields.join(", ")} WHERE id = ? AND session_id = ?`,
    params
  );
  return getSessionById(userId, sessionId);
};

// PUT /api/sessions/:id/reorder — body: { order: [sessionExerciseId, ...] }
// dans le nouvel ordre souhaité (doit contenir tous les exercices de la séance).
const reorderExercises = async (userId, sessionId, orderedIds) => {
  await ensureTable();
  const session = await findOwnedSession(userId, sessionId);
  if (!session) return null;

  for (let i = 0; i < orderedIds.length; i++) {
    await pool.query(
      `UPDATE session_exercises SET order_index = ? WHERE id = ? AND session_id = ?`,
      [i, orderedIds[i], sessionId]
    );
  }
  return getSessionById(userId, sessionId);
};

// PUT /api/sessions/:id/exercises — remplace intégralement la liste des
// exercices d'une séance (utilisé par l'écran d'édition : plus simple que de
// diffuser ajout/suppression/réordre exercice par exercice depuis le
// frontend). Les anciens session_exercises sont supprimés puis recréés dans
// le nouvel ordre fourni.
const replaceExercises = async (userId, sessionId, exercises = []) => {
  await ensureTable();
  const session = await findOwnedSession(userId, sessionId);
  if (!session) return null;

  await pool.query(`DELETE FROM session_exercises WHERE session_id = ?`, [sessionId]);

  for (let i = 0; i < exercises.length; i++) {
    const ex = exercises[i];
    await pool.query(
      `INSERT INTO session_exercises (session_id, exercise_id, order_index, sets, duration_seconds, rest_seconds)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        sessionId,
        toExerciseId(ex.exerciseId),
        i,
        ex.sets ?? 3,
        ex.durationSeconds ?? 60,
        ex.restSeconds ?? 60,
      ]
    );
  }

  return getSessionById(userId, sessionId);
};

module.exports = {
  ensureTable,
  createSession,
  getSessions,
  getSessionById,
  getSessionExercises,
  renameSession,
  addExercise,
  removeExercise,
  updateExercise,
  reorderExercises,
  replaceExercises,
};