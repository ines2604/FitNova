const pool = require("../config/db");
const { mediaUrl } = require("../utils/exerciseMedia");

// Table `exercises` : mêmes noms de colonnes que les champs de
// data/exercises.json du dataset https://github.com/shahanbutt/exercises-dataset
//
//   id                 "0001"  (identifiant du dataset, gardé en texte : zéros initiaux)
//   name, body_part, equipment, target, muscle_group, secondary_muscles
//   instructions       { en, fr, ... }   texte complet par langue
//   image, gif_url, created_at
//
// Colonnes du dataset volontairement NON conservées : category (identique à
// body_part), instruction_steps (même contenu que instructions), media_id et
// attribution (inutiles pour l'app).
//
// - La table est en utf8mb4 : les instructions du dataset existent aussi en
//   chinois, hindi, coréen, russe... et exigent un jeu de caractères complet.
// - `id` est en ascii_bin (des chiffres uniquement) : la jointure avec
//   session_exercises.exercise_id (même type) ne dépend ainsi pas de la
//   collation par défaut du serveur MySQL/MariaDB.
//
// `image` et `gif_url` contiennent les chemins relatifs du dataset ; l'API les
// renvoie en URL absolues (voir utils/exerciseMedia.js).
const LEGACY_SCHEMA_MESSAGE =
  "La table `exercises` utilise l'ancien schéma (wger). Exécute une fois " +
  "backend/scripts/migrate_exercises_dataset.sql puis relance le serveur " +
  "et l'import (node scripts/importExercises.js).";

let tableReady = null;
const ensureTable = async () => {
  if (!tableReady) {
    tableReady = (async () => {
      // Ancien schéma (colonne primary_muscle) : on ne le modifie pas
      // silencieusement, il faut passer par le script SQL de migration.
      const [legacy] = await pool.query(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'exercises'
           AND COLUMN_NAME = 'primary_muscle'`
      );
      if (legacy.length > 0) {
        throw new Error(LEGACY_SCHEMA_MESSAGE);
      }

      await pool.query(`
        CREATE TABLE IF NOT EXISTS exercises (
          id VARCHAR(10) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          body_part VARCHAR(50) NOT NULL,
          equipment VARCHAR(100) NOT NULL,
          instructions JSON NOT NULL,
          muscle_group VARCHAR(100) NOT NULL,
          secondary_muscles JSON NOT NULL,
          target VARCHAR(100) NOT NULL,
          image VARCHAR(255) NOT NULL,
          gif_url VARCHAR(255) NOT NULL,
          created_at DATETIME NULL,
          INDEX idx_body_part (body_part),
          INDEX idx_equipment (equipment),
          INDEX idx_target (target)
        ) CHARACTER SET utf8mb4
      `);

      // Migration automatique : supprime les colonnes retirées du schéma si la
      // table a été créée avant. Sans risque : la table n'est qu'un cache du
      // dataset, les autres colonnes ne sont pas touchées.
      const [existing] = await pool.query(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'exercises'`
      );
      const existingNames = existing.map((c) => c.COLUMN_NAME || c.column_name);
      const removedColumns = ["category", "instruction_steps", "media_id", "attribution"];
      for (const column of removedColumns) {
        if (existingNames.includes(column)) {
          await pool.query(`ALTER TABLE exercises DROP COLUMN ${column}`);
        }
      }
    })().catch((error) => {
      tableReady = null; // permet de réessayer après correction
      throw error;
    });
  }
  return tableReady;
};

// Colonnes légères pour les listes : on n'envoie pas les instructions
// (10 langues) pour chaque exercice d'une page de résultats.
const LIST_COLUMNS = `id, name, body_part, equipment, muscle_group,
  secondary_muscles, target, image, gif_url, created_at`;

// Selon le serveur MySQL/MariaDB, une colonne JSON peut être renvoyée par
// mysql2 sous forme de chaîne (MariaDB stocke JSON comme LONGTEXT). On
// normalise donc toujours les colonnes JSON avant de les envoyer au frontend.
const parseJson = (value, fallback) => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch (error) {
      return fallback;
    }
  }
  return value;
};

const parseSecondaryMuscles = (value) => {
  const parsed = parseJson(value, []);
  return Array.isArray(parsed) ? parsed : [];
};

// Ne garde que la langue demandée (défaut : français, la langue de l'app) avec
// repli sur l'anglais ; lang = "all" renvoie toutes les langues du dataset.
const pickLanguage = (map, lang) => {
  if (!map || typeof map !== "object" || lang === "all") return map || {};
  const key = map[lang] !== undefined ? lang : "en";
  return map[key] !== undefined ? { [key]: map[key] } : {};
};

const normalizeExercise = (row, lang = "fr") => {
  if (!row) return row;
  const normalized = {
    ...row,
    secondary_muscles: parseSecondaryMuscles(row.secondary_muscles),
    image: mediaUrl(row.image),
    gif_url: mediaUrl(row.gif_url),
  };
  if ("instructions" in row) {
    normalized.instructions = pickLanguage(parseJson(row.instructions, {}), lang);
  }
  return normalized;
};

// "2026-03-18T12:31:32.854798+00:00" -> "2026-03-18 12:31:32" (UTC)
const toMysqlDateTime = (iso) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 19).replace("T", " ");
};

// Upsert par lots utilisé par le script d'import
// (backend/scripts/importExercises.js). Idempotent : ré-exécuter l'import met
// simplement à jour les lignes existantes. `exercises` = objets du dataset.
const upsertExercises = async (exercises) => {
  await ensureTable();
  if (!exercises || exercises.length === 0) return;

  const values = exercises.map((ex) => [
    ex.id,
    ex.name,
    ex.body_part,
    ex.equipment,
    JSON.stringify(ex.instructions || {}),
    ex.muscle_group,
    JSON.stringify(ex.secondary_muscles || []),
    ex.target,
    ex.image,
    ex.gif_url,
    toMysqlDateTime(ex.created_at),
  ]);

  await pool.query(
    `INSERT INTO exercises
      (id, name, body_part, equipment, instructions,
       muscle_group, secondary_muscles, target, image, gif_url, created_at)
     VALUES ?
     ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       body_part = VALUES(body_part),
       equipment = VALUES(equipment),
       instructions = VALUES(instructions),
       muscle_group = VALUES(muscle_group),
       secondary_muscles = VALUES(secondary_muscles),
       target = VALUES(target),
       image = VALUES(image),
       gif_url = VALUES(gif_url),
       created_at = VALUES(created_at)`,
    [values]
  );
};

const countAll = async () => {
  await ensureTable();
  const [rows] = await pool.query("SELECT COUNT(*) AS total FROM exercises");
  return rows[0].total;
};

// GET /api/exercises — recherche + filtres combinables + pagination
const getExercises = async ({
  q,
  bodyPart,
  equipment,
  page = 1,
  limit = 20,
} = {}) => {
  await ensureTable();

  const where = [];
  const params = [];

  if (q) {
    where.push("name LIKE ?");
    params.push(`%${q}%`);
  }
  if (bodyPart) {
    where.push("body_part = ?");
    params.push(bodyPart);
  }
  if (equipment) {
    where.push("equipment = ?");
    params.push(equipment);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const offset = (safePage - 1) * safeLimit;

  const [rows] = await pool.query(
    `SELECT ${LIST_COLUMNS} FROM exercises ${whereClause}
     ORDER BY name ASC LIMIT ? OFFSET ?`,
    [...params, safeLimit, offset]
  );
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM exercises ${whereClause}`,
    params
  );

  return {
    items: rows.map((row) => normalizeExercise(row)),
    total: countRows[0].total,
    page: safePage,
    limit: safeLimit,
  };
};

// Fiche détaillée : inclut les instructions (langue `lang`, français par défaut).
const getExerciseById = async (id, lang = "fr") => {
  await ensureTable();
  const [rows] = await pool.query("SELECT * FROM exercises WHERE id = ?", [String(id)]);
  return normalizeExercise(rows[0], lang);
};

const getExercisesByIds = async (ids) => {
  await ensureTable();
  if (!ids || ids.length === 0) return [];
  const [rows] = await pool.query(
    `SELECT ${LIST_COLUMNS} FROM exercises WHERE id IN (${ids.map(() => "?").join(",")})`,
    ids.map(String)
  );
  return rows.map((row) => normalizeExercise(row));
};

// Catalogue complet en colonnes légères (sans instructions), pour le
// générateur de séances : ~1 300 lignes, filtrées et échantillonnées côté JS.
const getAllForGenerator = async () => {
  await ensureTable();
  const [rows] = await pool.query(
    `SELECT id, name, body_part, equipment, muscle_group, target, image FROM exercises`
  );
  return rows;
};

// Valeurs distinctes utilisées pour construire les filtres côté frontend.
const getFilterOptions = async () => {
  await ensureTable();
  const [bodyParts] = await pool.query(
    "SELECT DISTINCT body_part FROM exercises ORDER BY body_part"
  );
  const [equipments] = await pool.query(
    "SELECT DISTINCT equipment FROM exercises ORDER BY equipment"
  );

  return {
    bodyParts: bodyParts.map((r) => r.body_part),
    equipments: equipments.map((r) => r.equipment),
  };
};

module.exports = {
  ensureTable,
  upsertExercises,
  countAll,
  getExercises,
  getExerciseById,
  getExercisesByIds,
  getAllForGenerator,
  getFilterOptions,
  normalizeExercise,
};
