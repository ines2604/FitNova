/**
 * Teste le planificateur de séances sur TOUTES les combinaisons de scénarios,
 * sans base de données ni IA :
 *
 *   node scripts/testWorkoutPlanner.js
 *
 * Le catalogue de test imite le dataset d'exercices (anglais), une variante
 * française, et des catalogues volontairement pauvres pour vérifier les
 * replis (matériel élargi, séance plus courte, erreur claire).
 */

const assert = require("assert");
const P = require("../utils/workoutPlanner");

// ---------------------------------------------------------------------------
// Catalogues de test
// ---------------------------------------------------------------------------
const EN = {
  parts: {
    chest: ["pectorals"],
    back: ["lats", "upper back", "spine"],
    shoulders: ["delts", "traps"],
    "upper arms": ["biceps", "triceps"],
    "lower arms": ["forearms"],
    "upper legs": ["quads", "glutes", "hamstrings", "adductors"],
    "lower legs": ["calves"],
    waist: ["abs"],
    cardio: ["cardiovascular system"],
    neck: ["levator scapulae"],
  },
  equipment: [
    "body weight", "body weight", "body weight", "band", "resistance band", "dumbbell", "dumbbell",
    "kettlebell", "medicine ball", "stability ball", "barbell", "ez barbell", "cable", "leverage machine",
    "smith machine", "sled machine", "stationary bike", "elliptical machine", "assisted", "weighted",
  ],
};
const FR = {
  parts: {
    poitrine: ["pectoraux"],
    dos: ["grand dorsal", "trapèzes"],
    épaules: ["deltoïdes"],
    bras: ["biceps", "triceps"],
    "avant-bras": ["avant-bras"],
    cuisses: ["quadriceps", "fessiers", "ischio-jambiers"],
    mollets: ["mollets"],
    abdominaux: ["abdominaux"],
    cardio: ["système cardiovasculaire"],
    cou: ["élévateur de la scapula"],
  },
  equipment: [
    "poids du corps", "poids du corps", "poids du corps", "bande élastique", "haltère", "haltère",
    "kettlebell", "ballon de stabilité", "barre", "barre EZ", "poulie", "machine", "machine de Smith",
    "vélo stationnaire", "élliptique",
  ],
};

const buildCatalog = ({ parts, equipment }, perTarget = 12) => {
  const rows = [];
  let n = 0;
  for (const [bodyPart, targets] of Object.entries(parts)) {
    for (const target of targets) {
      for (let i = 0; i < perTarget; i++) {
        n++;
        rows.push({
          id: String(n).padStart(4, "0"),
          name: `${target} ${i + 1}`,
          body_part: bodyPart,
          target,
          muscle_group: target,
          equipment: equipment[(n * 7 + i) % equipment.length],
          image: `images/${n}.jpg`,
        });
      }
    }
  }
  return rows;
};

// ---------------------------------------------------------------------------
// Vérifications communes à un résultat
// ---------------------------------------------------------------------------
const stats = { runs: 0, maxDev: 0, worst: null, devs: [] };

const checkPlan = (plan, params, catalog, { strictEquipment = true } = {}) => {
  const preset = P.getPreset(params.goal, params.level);
  const label = JSON.stringify(params);
  const ids = plan.exercises.map((e) => e.exerciseId);

  assert(plan.exercises.length >= P.MIN_EXERCISES, `trop peu d'exercices ${label}`);
  assert(plan.exercises.length <= P.MAX_EXERCISES, `trop d'exercices ${label}`);
  assert.strictEqual(new Set(ids).size, ids.length, `doublons ${label}`);

  const byId = new Map(catalog.map((c) => [c.id, c]));
  const focusGroups = {
    full_body: ["upper", "lower", "core", "cardio"],
    upper_body: ["upper", "cardio"],
    lower_body: ["lower", "cardio"],
    core: ["core", "cardio"],
  }[params.focus];

  for (const ex of plan.exercises) {
    const src = byId.get(ex.exerciseId);
    assert(src, `id absent de la BD : ${ex.exerciseId} ${label}`);
    assert(Number.isInteger(ex.sets) && ex.sets >= preset.minSets && ex.sets <= preset.maxSets, `sets hors bornes ${label}`);
    assert(ex.durationSeconds >= preset.workMin && ex.durationSeconds <= preset.workMax, `durée hors bornes ${label}`);
    assert(ex.restSeconds >= preset.restMin && ex.restSeconds <= preset.restMax, `repos hors bornes ${label}`);
    assert(focusGroups.includes(P.groupOf(src)), `groupe ${P.groupOf(src)} hors focus ${label}`);
    assert.notStrictEqual(P.groupOf(src), null, `exercice exclu sélectionné ${label}`);
    if (strictEquipment && plan.warnings.length === 0) {
      const tier = P.equipmentTier(src.equipment);
      const allowed = { home_bodyweight: [0], home_equipment: [0, 1, 2], gym: [0, 1, 2, 3] }[params.location];
      assert(allowed.includes(tier), `matériel "${src.equipment}" interdit pour ${label}`);
    }
  }

  const recomputed = plan.exercises.reduce((t, e) => t + e.sets * (e.durationSeconds + e.restSeconds), 0);
  assert.strictEqual(plan.totalSeconds, recomputed, `durée totale incohérente ${label}`);

  // le gainage est en fin de séance
  const groups = plan.exercises.map((e) => e.group);
  const lastNonCore = groups.map((g) => g !== "core").lastIndexOf(true);
  const firstCore = groups.indexOf("core");
  if (firstCore !== -1 && lastNonCore !== -1) {
    assert(firstCore > lastNonCore, `gainage pas en fin de séance ${label}`);
  }

  const dev = Math.abs(plan.totalSeconds - plan.targetSeconds) / plan.targetSeconds;
  stats.devs.push(dev);
  if (dev > stats.maxDev) {
    stats.maxDev = dev;
    stats.worst = { params, total: plan.totalSeconds, target: plan.targetSeconds, n: plan.exercises.length };
  }
  return dev;
};

// ---------------------------------------------------------------------------
// 1. Tous les scénarios, deux catalogues, plusieurs graines
// ---------------------------------------------------------------------------
const DURATIONS = [10, 15, 20, 30, 45, 60, 75, 90];
const catalogs = { EN: buildCatalog(EN), FR: buildCatalog(FR) };
let scenarios = 0;

for (const [catName, catalog] of Object.entries(catalogs)) {
  for (const goal of P.GOALS)
    for (const level of P.LEVELS)
      for (const location of P.LOCATIONS)
        for (const focus of P.FOCUSES)
          for (const durationMinutes of DURATIONS) {
            const params = P.validateParams({ goal, level, location, focus, durationMinutes });
            for (const seed of [1, 2, 3]) {
              const plan = P.planWithRules(catalog, params, { rng: P.mulberry32(seed) });
              checkPlan(plan, params, catalog);
              stats.runs++;
            }
            scenarios++;
          }
  console.log(`Catalogue ${catName} : OK`);
}

// ---------------------------------------------------------------------------
// 2. Validation des paramètres
// ---------------------------------------------------------------------------
for (const bad of [
  { goal: "x", level: "beginner", location: "gym", durationMinutes: 30 },
  { goal: "weight_loss", level: "x", location: "gym", durationMinutes: 30 },
  { goal: "weight_loss", level: "beginner", location: "x", durationMinutes: 30 },
  { goal: "weight_loss", level: "beginner", location: "gym", focus: "x", durationMinutes: 30 },
  { goal: "weight_loss", level: "beginner", location: "gym", durationMinutes: 5 },
  { goal: "weight_loss", level: "beginner", location: "gym", durationMinutes: 91 },
  { goal: "weight_loss", level: "beginner", location: "gym", durationMinutes: "abc" },
  { goal: "weight_loss", level: "beginner", location: "gym", durationMinutes: 30.5 },
]) {
  assert.throws(() => P.validateParams(bad), (e) => e instanceof P.PlannerError && e.status === 400);
}
assert.strictEqual(
  P.validateParams({ goal: "maintenance", level: "beginner", location: "gym", durationMinutes: "30" }).focus,
  "full_body"
);

// ---------------------------------------------------------------------------
// 3. Catalogues pauvres : repli, séance plus courte, erreur claire
// ---------------------------------------------------------------------------
{
  // aucun exercice au poids du corps mais du petit matériel : "maison sans
  // matériel" doit élargir d'un cran et avertir
  const lightOnly = buildCatalog({ parts: EN.parts, equipment: ["dumbbell", "kettlebell", "band"] });
  const params = P.validateParams({ goal: "muscle_gain", level: "advanced", location: "home_bodyweight", focus: "full_body", durationMinutes: 45 });
  const plan = P.planWithRules(lightOnly, params, { rng: P.mulberry32(1) });
  assert(plan.warnings.length > 0, "l'élargissement du matériel doit être signalé");
  checkPlan(plan, params, lightOnly, { strictEquipment: false });

  // uniquement du matériel de salle : jamais de barre/machine proposée à la maison
  const gymOnly = buildCatalog({ parts: EN.parts, equipment: ["barbell", "cable", "leverage machine"] });
  assert.throws(
    () => P.planWithRules(gymOnly, params, { rng: P.mulberry32(1) }),
    (e) => e instanceof P.PlannerError && e.status === 422
  );
  const homeEq = P.validateParams({ goal: "muscle_gain", level: "advanced", location: "home_equipment", focus: "full_body", durationMinutes: 45 });
  const relaxedPlan = P.planWithRules(gymOnly, homeEq, { rng: P.mulberry32(1) });
  assert(relaxedPlan.warnings.length > 0, "home_equipment sans rien d'adapté doit élargir au matériel de salle et avertir");

  // très peu d'exercices : séance plus courte que demandée, mais valide
  const tiny = buildCatalog({ parts: { waist: ["abs"], chest: ["pectorals"] }, equipment: ["body weight"] }, 2);
  const p2 = P.validateParams({ goal: "weight_loss", level: "beginner", location: "home_bodyweight", focus: "full_body", durationMinutes: 60 });
  const plan2 = P.planWithRules(tiny, p2, { rng: P.mulberry32(1) });
  assert(plan2.exercises.length >= P.MIN_EXERCISES && plan2.exercises.length <= 4);
  assert(plan2.warnings.length > 0, "une durée non atteinte doit être signalée");

  // rien d'exploitable : erreur 422 explicite
  const empty = buildCatalog({ parts: { neck: ["levator scapulae"] }, equipment: ["body weight"] }, 5);
  assert.throws(
    () => P.planWithRules(empty, p2, { rng: P.mulberry32(1) }),
    (e) => e instanceof P.PlannerError && e.status === 422
  );
  assert.throws(() => P.planWithRules([], p2), (e) => e instanceof P.PlannerError && e.status === 422);
}

// ---------------------------------------------------------------------------
// 4. Réponses de l'IA : validation et repli
// ---------------------------------------------------------------------------
{
  const catalog = catalogs.EN;
  const params = P.validateParams({ goal: "weight_loss", level: "intermediate", location: "gym", focus: "full_body", durationMinutes: 30 });
  const { pool } = P.buildPoolWithFallback(catalog, params);
  const real = catalog.filter((c) => pool.byId.has(c.id)).slice(0, 8).map((c) => c.id);

  // réponse valide mais avec pièges : id inventé, doublon, id numérique, valeurs hors bornes
  const messy = {
    name: "  Ma séance IA  ",
    exercises: [
      { exerciseId: real[0], sets: 9, durationSeconds: 300, restSeconds: 1 },
      { exerciseId: real[0], sets: 3, durationSeconds: 40, restSeconds: 30 }, // doublon
      { exerciseId: "9999999", sets: 3, durationSeconds: 40, restSeconds: 30 }, // inventé
      { exerciseId: Number(real[1]), sets: 3, durationSeconds: 40, restSeconds: 30 }, // id numérique
      { exerciseId: real[2], sets: "abc", durationSeconds: null, restSeconds: undefined },
      { exerciseId: real[3], sets: 3, durationSeconds: 40, restSeconds: 30 },
    ],
  };
  const plan = P.sanitizeAiPlan(messy, pool, params);
  assert(plan && plan.source === "ai");
  assert.strictEqual(plan.name, "Ma séance IA");
  const ids = plan.exercises.map((e) => e.exerciseId);
  assert(!ids.includes("9999999"));
  assert.strictEqual(new Set(ids).size, ids.length);
  assert(ids.includes(real[1]), "un id numérique doit être normalisé sur 4 chiffres");
  checkPlan(plan, params, catalog);

  // réponses inutilisables -> null (=> repli sur les règles)
  for (const bad of [null, undefined, {}, { exercises: "x" }, { exercises: [] },
    { exercises: [{ exerciseId: "nope" }] }, { exercises: [{ exerciseId: real[0] }] }]) {
    assert.strictEqual(P.sanitizeAiPlan(bad, pool, params), null);
  }

  // candidats envoyés à l'IA : sous-ensemble borné et uniquement des exercices du pool
  const candidates = P.buildAiCandidates(pool, params, P.mulberry32(5));
  assert(candidates.length >= 20 && candidates.length <= 56, `candidats : ${candidates.length}`);
  assert(candidates.every((c) => pool.byId.has(c.id)));
  assert(P.buildAiPrompt(candidates, params).includes(candidates[0].id));
}

// ---------------------------------------------------------------------------
// Bilan
// ---------------------------------------------------------------------------
stats.devs.sort((a, b) => a - b);
const pct = (q) => (stats.devs[Math.floor(q * (stats.devs.length - 1))] * 100).toFixed(1);
console.log(`\n${scenarios} scénarios × 3 graines = ${stats.runs} séances vérifiées.`);
console.log(`Écart à la durée demandée — médiane ${pct(0.5)} %, 95e centile ${pct(0.95)} %, max ${(stats.maxDev * 100).toFixed(1)} %`);
console.log("Pire cas :", JSON.stringify(stats.worst));
console.log("\nTOUS LES TESTS PASSENT");
