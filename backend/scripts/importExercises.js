/**
 * Import du catalogue d'exercices depuis le dataset
 * https://github.com/shahanbutt/exercises-dataset (data/exercises.json,
 * 1 324 exercices) vers la table MySQL `exercises`.
 *
 * Les colonnes de la table portent exactement les noms des champs du dataset
 * (id, name, body_part, equipment, instructions, muscle_group,
 * secondary_muscles, target, image, gif_url, created_at). Rien n'est calculé
 * ni deviné. Les champs category, instruction_steps, media_id et attribution
 * du dataset sont ignorés (doublons ou inutiles pour l'app).
 *
 * Usage :
 *   node scripts/importExercises.js                       # télécharge exercises.json depuis GitHub
 *   node scripts/importExercises.js ./exercises.json      # utilise un fichier local
 *
 * Idempotent : relancer l'import met à jour les lignes existantes.
 */

const fs = require("fs");
const path = require("path");
const exerciseModel = require("../models/exercise.model");

const DATASET_URL =
  "https://raw.githubusercontent.com/shahanbutt/exercises-dataset/main/data/exercises.json";
// Chaque exercice pèse ~13 Ko (instructions en 10 langues). MySQL/MariaDB
// refuse les requêtes plus grosses que max_allowed_packet (1 Mo par défaut
// sur XAMPP/MariaDB), donc on découpe les lots selon leur taille et non selon
// leur nombre.
const MAX_BATCH_BYTES = 400 * 1024;
const MAX_BATCH_ITEMS = 100;

const REQUIRED_FIELDS = [
  "id",
  "name",
  "body_part",
  "equipment",
  "instructions",
  "muscle_group",
  "secondary_muscles",
  "target",
  "image",
  "gif_url",
];

async function loadDataset(localPath) {
  if (localPath) {
    const fullPath = path.resolve(localPath);
    console.log(`Lecture du fichier local : ${fullPath}`);
    return JSON.parse(fs.readFileSync(fullPath, "utf-8"));
  }
  console.log(`Téléchargement du dataset : ${DATASET_URL}`);
  const res = await fetch(DATASET_URL);
  if (!res.ok) {
    throw new Error(`Échec du téléchargement (${res.status}) : ${DATASET_URL}`);
  }
  return res.json();
}

// Un exercice est importable si tous les champs attendus sont présents.
function isValid(exercise) {
  return REQUIRED_FIELDS.every(
    (field) => exercise[field] !== undefined && exercise[field] !== null && exercise[field] !== ""
  );
}

async function run() {
  const dataset = await loadDataset(process.argv[2]);
  if (!Array.isArray(dataset)) {
    throw new Error("Format inattendu : exercises.json doit contenir un tableau.");
  }

  const valid = dataset.filter(isValid);
  const skipped = dataset.length - valid.length;
  console.log(`${dataset.length} exercices lus (${skipped} ignorés car incomplets).`);

  let imported = 0;
  let batch = [];
  let batchBytes = 0;

  const flush = async () => {
    if (batch.length === 0) return;
    await exerciseModel.upsertExercises(batch);
    imported += batch.length;
    console.log(`  ${imported} / ${valid.length}`);
    batch = [];
    batchBytes = 0;
  };

  for (const exercise of valid) {
    const size = Buffer.byteLength(JSON.stringify(exercise));
    if (batch.length > 0 && (batchBytes + size > MAX_BATCH_BYTES || batch.length >= MAX_BATCH_ITEMS)) {
      await flush();
    }
    batch.push(exercise);
    batchBytes += size;
  }
  await flush();

  const total = await exerciseModel.countAll();
  console.log(`Import terminé : ${imported} exercices importés, ${total} lignes en base.`);
  process.exit(0);
}

run().catch((err) => {
  console.error("Erreur import exercices :", err.message);
  process.exit(1);
});
