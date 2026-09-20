// Génération de séances de sport — logique pure (aucun accès BD ni IA), donc
// testable seule (voir scripts/testWorkoutPlanner.js).
//
// Tout ce qui sort d'ici correspond exactement aux colonnes de la table
// `session_exercises` : exercise_id, sets, duration_seconds, rest_seconds.
// Il n'y a volontairement PAS de répétitions : la durée d'une série est
// `duration_seconds` (temps de travail), et la durée totale d'une séance est
// Σ sets × (duration_seconds + rest_seconds) — la même formule que
// TOTAL_DURATION_SQL (models/workoutSession.model.js) et
// estimateSessionDurationSeconds (utils/workoutCalories.js).
//
// Scénarios couverts (toutes les combinaisons sont valides) :
//   objectif  (3) : weight_loss, muscle_gain, maintenance   (= profiles.goal)
//   niveau    (3) : beginner, intermediate, advanced
//   lieu      (3) : home_bodyweight, home_equipment, gym
//   focus     (4) : full_body, upper_body, lower_body, core
//   durée         : 10 à 90 min (l'app propose 15 / 20 / 30 / 45 / 60 / 90)

const GOALS = ["weight_loss", "muscle_gain", "maintenance"];
const LEVELS = ["beginner", "intermediate", "advanced"];
const LOCATIONS = ["home_bodyweight", "home_equipment", "gym"];
const FOCUSES = ["full_body", "upper_body", "lower_body", "core"];
const MIN_DURATION_MIN = 10;
const MAX_DURATION_MIN = 90;

const GOAL_LABELS = {
  weight_loss: "Perte de poids",
  muscle_gain: "Prise de muscle",
  maintenance: "Forme & entretien",
};
const FOCUS_LABELS = {
  full_body: "Full body",
  upper_body: "Haut du corps",
  lower_body: "Bas du corps",
  core: "Abdos & gainage",
};

// ---------------------------------------------------------------------------
// Valeurs de séries / durée / repos par objectif et niveau
// ---------------------------------------------------------------------------
// sets = nombre de séries, work = durée d'une série (s), rest = repos entre
// séries (s). Les bornes empêchent l'IA (ou l'ajustement de durée) de sortir
// de valeurs raisonnables pour l'objectif.
const GLOBAL_SETS = { min: 2, max: 5 };
const MIN_EXERCISES = 2;
const MAX_EXERCISES = 12;

const PRESETS = {
  weight_loss: {
    // circuit : séries courtes et repos brefs pour garder le cœur haut
    ranges: { work: [30, 60], rest: [15, 45] },
    levels: {
      beginner: { sets: 3, work: 30, rest: 40 },
      intermediate: { sets: 3, work: 40, rest: 30 },
      advanced: { sets: 4, work: 45, rest: 20 },
    },
  },
  muscle_gain: {
    // temps sous tension plus long, vrai repos entre les séries
    ranges: { work: [30, 60], rest: [45, 120] },
    levels: {
      beginner: { sets: 3, work: 40, rest: 60 },
      intermediate: { sets: 4, work: 45, rest: 75 },
      advanced: { sets: 4, work: 50, rest: 90 },
    },
  },
  maintenance: {
    ranges: { work: [30, 60], rest: [30, 75] },
    levels: {
      beginner: { sets: 3, work: 35, rest: 45 },
      intermediate: { sets: 3, work: 45, rest: 45 },
      advanced: { sets: 4, work: 45, rest: 30 },
    },
  },
};

const getPreset = (goal, level) => {
  const p = PRESETS[goal];
  const base = p.levels[level];
  return {
    ...base,
    minSets: GLOBAL_SETS.min,
    // on ne dépasse jamais base + 1 série (et 5 au maximum) : un débutant ne
    // reçoit pas 5 séries même si la séance est longue, on ajoute plutôt des
    // exercices.
    maxSets: Math.min(GLOBAL_SETS.max, base.sets + 1),
    workMin: p.ranges.work[0],
    workMax: p.ranges.work[1],
    restMin: p.ranges.rest[0],
    restMax: p.ranges.rest[1],
  };
};

// Séance d'environ 6 minutes par exercice (arrondi), entre 3 et 12 exercices :
// 15 min -> 3, 30 min -> 5, 45 min -> 8, 60 min -> 10.
const initialExerciseCount = (durationMin) =>
  Math.min(MAX_EXERCISES, Math.max(3, Math.round(durationMin / 6)));

// ---------------------------------------------------------------------------
// Classement des exercices de la BD (groupe musculaire + niveau de matériel)
// ---------------------------------------------------------------------------
// Les valeurs de `body_part` / `equipment` dépendent du catalogue importé
// (anglais du dataset actuel, ou français si tu migres vers WorkoutX) : on
// reconnaît donc les deux langues par mots-clés, sans dépendre d'une liste
// exacte de valeurs.
const norm = (value) =>
  String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const tokensOf = (value) => norm(value).split(/[^a-z0-9]+/).filter(Boolean);

const hasKeyword = (tokens, keywords) =>
  tokens.some((t) =>
    keywords.some((k) => t === k || (k.length >= 5 && t.startsWith(k)))
  );

const EXCLUDED_KEYWORDS = ["neck", "cou", "cervical", "cervicales", "stretch", "stretching", "etirement", "mobility", "mobilite"];
const GROUP_KEYWORDS = [
  ["cardio", ["cardio"]],
  ["core", ["waist", "abs", "abdo", "abdominal", "abdominaux", "core", "taille", "gainage"]],
  ["lower", ["leg", "legs", "glute", "glutes", "quad", "quads", "quadriceps", "hamstring", "hamstrings", "calf", "calves", "thigh", "thighs", "jambe", "jambes", "cuisse", "cuisses", "mollet", "mollets", "fessier", "fessiers", "ischio", "adductor", "adductors", "abductor", "abductors"]],
  ["upper", ["chest", "back", "shoulder", "shoulders", "arm", "arms", "bicep", "biceps", "tricep", "triceps", "forearm", "forearms", "pector", "pectoral", "pectoraux", "dos", "epaule", "epaules", "bras", "trap", "traps", "trapeze", "trapezes", "lat", "lats", "delt", "delts", "deltoid", "deltoids", "poitrine"]],
];

const classifyText = (value) => {
  const tokens = tokensOf(value);
  if (tokens.length === 0) return null;
  if (hasKeyword(tokens, EXCLUDED_KEYWORDS)) return "excluded";
  for (const [group, keywords] of GROUP_KEYWORDS) {
    if (hasKeyword(tokens, keywords)) return group;
  }
  return null;
};

// "upper" | "lower" | "core" | "cardio" | null (exclu : cou, étirements…)
const groupOf = (exercise) => {
  const byBodyPart = classifyText(exercise.body_part);
  if (byBodyPart === "excluded") return null;
  if (byBodyPart) return byBodyPart;
  const byMuscleGroup = classifyText(exercise.muscle_group);
  if (byMuscleGroup && byMuscleGroup !== "excluded") return byMuscleGroup;
  const byTarget = classifyText(exercise.target);
  if (byTarget && byTarget !== "excluded") return byTarget;
  return null;
};

// 0 = poids du corps, 1 = bande élastique, 2 = petit matériel (haltères,
// kettlebell, ballons…), 3 = matériel de salle (barre, machines, poulies…).
const equipmentTier = (equipment) => {
  const text = norm(equipment);
  const tokens = tokensOf(equipment);
  if (
    text === "" ||
    text === "none" ||
    text === "aucun" ||
    /body\s*weight|bodyweight|poids\s+d[ue]\s+corps|poids\s+corporel|sans\s+materiel/.test(text)
  ) {
    return 0;
  }
  if (hasKeyword(tokens, ["band", "bands", "bande", "bandes", "elastique", "elastiques"])) return 1;
  if (
    hasKeyword(tokens, [
      "dumbbell", "dumbbells", "halter", "halteres", "haltere", "kettlebell", "kettlebells",
      "ball", "balls", "ballon", "ballons", "bosu", "roller", "rope", "corde", "wheel", "roue", "swiss",
    ])
  ) {
    return 2;
  }
  return 3;
};

const ALLOWED_TIERS = {
  home_bodyweight: [0],
  home_equipment: [0, 1, 2],
  gym: [0, 1, 2, 3],
};

// Si le lieu choisi n'a pas assez d'exercices dans la BD, on élargit d'un
// cran (et on le signale) plutôt que de renvoyer une séance vide.
const RELAXED_TIERS = {
  home_bodyweight: [0, 1, 2],
  home_equipment: [0, 1, 2, 3],
  gym: [0, 1, 2, 3],
};

const FOCUS_GROUPS = {
  full_body: ["upper", "lower", "core", "cardio"],
  upper_body: ["upper"],
  lower_body: ["lower"],
  core: ["core"],
};

// Ordre des groupes musculaires à travers la séance, selon l'objectif.
const SLOT_ROTATION = {
  full_body: {
    weight_loss: ["lower", "cardio", "upper", "core"],
    muscle_gain: ["upper", "lower", "upper", "lower", "core"],
    maintenance: ["lower", "upper", "core", "cardio"],
  },
  upper_body: {
    weight_loss: ["upper", "upper", "cardio"],
    muscle_gain: ["upper"],
    maintenance: ["upper"],
  },
  lower_body: {
    weight_loss: ["lower", "lower", "cardio"],
    muscle_gain: ["lower"],
    maintenance: ["lower"],
  },
  core: {
    weight_loss: ["core", "core", "cardio"],
    muscle_gain: ["core"],
    maintenance: ["core"],
  },
};

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------
const mulberry32 = (seed) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const shuffle = (list, rng) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const roundTo5 = (value) => Math.round(value / 5) * 5;
const toInt = (value, fallback) => {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? n : fallback;
};

// Durée totale (secondes) d'une liste { sets, work, rest }.
const totalSeconds = (items) =>
  items.reduce((sum, it) => sum + it.sets * (it.work + it.rest), 0);

// Les ids du dataset sont des textes sur 4 chiffres ("0025") : même
// normalisation que toExerciseId() du modèle de séances.
const normalizeExerciseId = (value) => {
  const id = String(value ?? "").trim();
  return /^\d+$/.test(id) ? id.padStart(4, "0") : id;
};

// ---------------------------------------------------------------------------
// Validation des paramètres
// ---------------------------------------------------------------------------
class PlannerError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "PlannerError";
    this.status = status;
  }
}

const validateParams = (input = {}) => {
  const { goal, level, location } = input;
  const focus = input.focus ?? "full_body";
  const durationMinutes = Number(input.durationMinutes);

  if (!GOALS.includes(goal)) {
    throw new PlannerError(`Objectif invalide (attendu : ${GOALS.join(", ")})`);
  }
  if (!LEVELS.includes(level)) {
    throw new PlannerError(`Niveau invalide (attendu : ${LEVELS.join(", ")})`);
  }
  if (!LOCATIONS.includes(location)) {
    throw new PlannerError(`Lieu invalide (attendu : ${LOCATIONS.join(", ")})`);
  }
  if (!FOCUSES.includes(focus)) {
    throw new PlannerError(`Focus invalide (attendu : ${FOCUSES.join(", ")})`);
  }
  if (
    !Number.isInteger(durationMinutes) ||
    durationMinutes < MIN_DURATION_MIN ||
    durationMinutes > MAX_DURATION_MIN
  ) {
    throw new PlannerError(
      `Durée invalide (entier entre ${MIN_DURATION_MIN} et ${MAX_DURATION_MIN} minutes)`
    );
  }
  return { goal, level, location, focus, durationMinutes };
};

// ---------------------------------------------------------------------------
// Sélection dans le catalogue
// ---------------------------------------------------------------------------
// Ne garde que les exercices utilisables pour ce lieu et ce focus, et les
// range par groupe musculaire. `exercises` : lignes de la table `exercises`
// (id, name, body_part, equipment, target, muscle_group, image).
const buildPool = (exercises, { location, focus }, tiers = ALLOWED_TIERS[location]) => {
  const groups = FOCUS_GROUPS[focus];
  const byGroup = {};
  const byId = new Map();
  for (const ex of exercises) {
    if (!ex || ex.id === undefined || ex.id === null) continue;
    const group = groupOf(ex);
    if (!group || !groups.includes(group)) continue;
    if (!tiers.includes(equipmentTier(ex.equipment))) continue;
    const entry = {
      id: normalizeExerciseId(ex.id),
      name: ex.name,
      group,
      target: norm(ex.target) || norm(ex.muscle_group) || group,
      body_part: ex.body_part,
      equipment: ex.equipment,
      image: ex.image ?? null,
    };
    if (byId.has(entry.id)) continue;
    (byGroup[group] = byGroup[group] || []).push(entry);
    byId.set(entry.id, entry);
  }
  return { byGroup, byId, size: byId.size };
};

// Pool avec élargissement automatique du matériel si le catalogue est trop
// pauvre pour ce scénario. Renvoie aussi les avertissements à afficher.
const buildPoolWithFallback = (exercises, params) => {
  const warnings = [];
  let pool = buildPool(exercises, params);
  if (pool.size < MIN_EXERCISES + 1 && params.location !== "gym") {
    const relaxed = buildPool(exercises, params, RELAXED_TIERS[params.location]);
    if (relaxed.size > pool.size) {
      pool = relaxed;
      warnings.push(
        "Peu d'exercices trouvés pour ce matériel : la sélection a été élargie à d'autres équipements."
      );
    }
  }
  if (pool.size < MIN_EXERCISES) {
    throw new PlannerError(
      "Pas assez d'exercices dans la base pour ce scénario. Essaie un autre lieu ou un autre focus.",
      422
    );
  }
  return { pool, warnings };
};

// Choisit `count` exercices en suivant la rotation de groupes de l'objectif et
// en variant les muscles ciblés (le muscle le moins utilisé passe en premier).
const selectExercises = (pool, { goal, focus }, count, rng) => {
  const rotation = SLOT_ROTATION[focus][goal];
  const focusGroups = FOCUS_GROUPS[focus];
  const used = new Set();
  const targetUsage = {};
  const picked = [];

  const pickFrom = (group) => {
    const candidates = (pool.byGroup[group] || []).filter((e) => !used.has(e.id));
    if (candidates.length === 0) return null;
    let best = null;
    let bestScore = Infinity;
    for (const e of shuffle(candidates, rng)) {
      const score = targetUsage[e.target] || 0;
      if (score < bestScore) {
        best = e;
        bestScore = score;
      }
    }
    return best;
  };

  for (let slot = 0; picked.length < count; slot++) {
    const wanted = rotation[slot % rotation.length];
    // groupe voulu d'abord, puis les autres groupes du focus, cardio en dernier
    const fallbackOrder = [wanted, ...focusGroups.filter((g) => g !== wanted && g !== "cardio"), "cardio"];
    let chosen = null;
    for (const group of fallbackOrder) {
      chosen = pickFrom(group);
      if (chosen) break;
    }
    if (!chosen) break; // catalogue épuisé
    used.add(chosen.id);
    targetUsage[chosen.target] = (targetUsage[chosen.target] || 0) + 1;
    picked.push(chosen);
  }
  return picked;
};

// Le gainage se fait en fin de séance ; l'ordre reste stable pour le reste.
const coreLast = (items) => {
  const rank = (it) => (it.group === "core" ? 1 : 0);
  return items
    .map((it, index) => ({ it, index }))
    .sort((a, b) => rank(a.it) - rank(b.it) || a.index - b.index)
    .map(({ it }) => it);
};

// ---------------------------------------------------------------------------
// Ajustement à la durée demandée
// ---------------------------------------------------------------------------
// items : [{ exercise, sets, work, rest }] ; extras : exercices supplémentaires
// utilisables si la séance est trop courte. Chaque action n'est acceptée que si
// elle rapproche la durée totale de la cible, ce qui garantit la fin de la
// boucle et évite les allers-retours.
const fitToDuration = (items, targetSeconds, preset, extras = []) => {
  let cur = items.map((it) => ({ ...it }));
  let pool = [...extras];
  const tolerance = Math.max(30, Math.round(targetSeconds * 0.05));

  const withItems = (fn) => {
    const next = cur.map((it) => ({ ...it }));
    return fn(next) ? next : null;
  };

  const decrease = [
    // retire une série à l'exercice qui en a le plus (en partant de la fin)
    () =>
      withItems((next) => {
        let idx = -1;
        for (let i = next.length - 1; i >= 0; i--) {
          if (next[i].sets > preset.minSets && (idx === -1 || next[i].sets > next[idx].sets)) idx = i;
        }
        if (idx === -1) return false;
        next[idx].sets -= 1;
        return true;
      }),
    () =>
      withItems((next) => {
        if (!next.some((it) => it.rest > preset.restMin)) return false;
        next.forEach((it) => (it.rest = Math.max(preset.restMin, it.rest - 5)));
        return true;
      }),
    () =>
      withItems((next) => {
        if (!next.some((it) => it.work > preset.workMin)) return false;
        next.forEach((it) => (it.work = Math.max(preset.workMin, it.work - 5)));
        return true;
      }),
    () => {
      if (cur.length <= MIN_EXERCISES) return null;
      return cur.slice(0, -1).map((it) => ({ ...it }));
    },
  ];

  const increase = [
    // ajoute une série à l'exercice qui en a le moins (en partant du début)
    () =>
      withItems((next) => {
        let idx = -1;
        for (let i = 0; i < next.length; i++) {
          if (next[i].sets < preset.maxSets && (idx === -1 || next[i].sets < next[idx].sets)) idx = i;
        }
        if (idx === -1) return false;
        next[idx].sets += 1;
        return true;
      }),
    () => {
      if (cur.length >= MAX_EXERCISES || pool.length === 0) return null;
      const extra = pool[0];
      return [
        ...cur.map((it) => ({ ...it })),
        { exercise: extra, sets: preset.sets, work: preset.work, rest: preset.rest },
      ];
    },
    () =>
      withItems((next) => {
        if (!next.some((it) => it.rest < preset.restMax)) return false;
        next.forEach((it) => (it.rest = Math.min(preset.restMax, it.rest + 5)));
        return true;
      }),
    () =>
      withItems((next) => {
        if (!next.some((it) => it.work < preset.workMax)) return false;
        next.forEach((it) => (it.work = Math.min(preset.workMax, it.work + 5)));
        return true;
      }),
  ];

  for (let iter = 0; iter < 400; iter++) {
    const error = totalSeconds(cur) - targetSeconds;
    if (Math.abs(error) <= tolerance) break;

    const actions = error > 0 ? decrease : increase;
    let applied = false;
    for (const action of actions) {
      const before = cur.length;
      const next = action();
      if (!next) continue;
      if (Math.abs(totalSeconds(next) - targetSeconds) < Math.abs(error)) {
        if (next.length > before) pool = pool.slice(1); // un extra a été consommé
        cur = next;
        applied = true;
        break;
      }
    }
    if (!applied) break;
  }
  return cur;
};

// ---------------------------------------------------------------------------
// Construction du résultat
// ---------------------------------------------------------------------------
const buildName = ({ goal, focus, durationMinutes }) =>
  `${FOCUS_LABELS[focus]} ${durationMinutes} min · ${GOAL_LABELS[goal]}`;

const toResult = (items, params, source, warnings, name) => {
  const total = totalSeconds(items);
  return {
    name: name || buildName(params),
    source,
    targetSeconds: params.durationMinutes * 60,
    totalSeconds: total,
    warnings,
    params,
    exercises: items.map((it) => ({
      exerciseId: it.exercise.id,
      name: it.exercise.name,
      image: it.exercise.image,
      bodyPart: it.exercise.body_part,
      equipment: it.exercise.equipment,
      group: it.exercise.group,
      sets: it.sets,
      durationSeconds: it.work,
      restSeconds: it.rest,
    })),
  };
};

// Séance 100 % règles : fonctionne sans IA, pour tous les scénarios.
const planWithRules = (exercises, params, { rng = Math.random, poolInfo } = {}) => {
  const { pool, warnings } = poolInfo || buildPoolWithFallback(exercises, params);
  const preset = getPreset(params.goal, params.level);
  const targetSeconds = params.durationMinutes * 60;

  // On sélectionne MAX_EXERCISES d'avance : les premiers forment la séance,
  // les suivants servent de réserve si la durée demandée est longue.
  const selected = selectExercises(pool, params, MAX_EXERCISES, rng);
  const count = Math.min(initialExerciseCount(params.durationMinutes), selected.length);
  const toItem = (exercise) => ({ exercise, sets: preset.sets, work: preset.work, rest: preset.rest });

  let items = fitToDuration(
    selected.slice(0, count).map(toItem),
    targetSeconds,
    preset,
    selected.slice(count)
  );
  items = coreLast(items.map((it) => ({ ...it, group: it.exercise.group }))).map(({ group, ...it }) => it);

  if (Math.abs(totalSeconds(items) - targetSeconds) > targetSeconds * 0.15) {
    warnings.push(
      "Le catalogue offre peu d'exercices pour ce scénario : la durée réelle s'écarte un peu de celle demandée."
    );
  }
  return toResult(items, params, "rules", warnings);
};

// ---------------------------------------------------------------------------
// Partie IA : liste réduite envoyée à Gemini + validation de sa réponse
// ---------------------------------------------------------------------------
// Sous-ensemble équilibré du catalogue (jamais tout le catalogue : coût et
// hallucinations), dans lequel l'IA choisit et ordonne les exercices.
const buildAiCandidates = (pool, params, rng = Math.random, perGroupMax = 14) => {
  const groups = Object.keys(pool.byGroup);
  const total = Math.min(48, Math.max(20, initialExerciseCount(params.durationMinutes) * 4));
  const perGroup = Math.min(perGroupMax, Math.ceil(total / Math.max(1, groups.length)));
  const candidates = [];
  for (const group of groups) {
    // Un exercice par muscle ciblé à tour de rôle, pour varier le sous-ensemble.
    const buckets = new Map();
    for (const e of shuffle(pool.byGroup[group], rng)) {
      if (!buckets.has(e.target)) buckets.set(e.target, []);
      buckets.get(e.target).push(e);
    }
    const lists = [...buckets.values()];
    const picked = [];
    for (let round = 0; picked.length < perGroup; round++) {
      let added = false;
      for (const list of lists) {
        if (round < list.length && picked.length < perGroup) {
          picked.push(list[round]);
          added = true;
        }
      }
      if (!added) break;
    }
    candidates.push(...picked);
  }
  return candidates;
};

const buildAiPrompt = (candidates, params) => {
  const preset = getPreset(params.goal, params.level);
  const count = initialExerciseCount(params.durationMinutes);
  return `Crée une séance de sport de ${params.durationMinutes} minutes.
Objectif : ${GOAL_LABELS[params.goal]}. Niveau : ${params.level}. Focus : ${FOCUS_LABELS[params.focus]}. Lieu : ${params.location}.

Choisis environ ${count} exercices UNIQUEMENT dans la liste ci-dessous, en recopiant leur "id" à l'identique.
Varie les muscles ciblés et ordonne les exercices de façon logique (gros mouvements d'abord, gainage à la fin).
Pour chaque exercice, donne :
- sets : nombre de séries, entre ${preset.minSets} et ${preset.maxSets} (typique : ${preset.sets})
- durationSeconds : durée de travail d'une série, entre ${preset.workMin} et ${preset.workMax} secondes (typique : ${preset.work})
- restSeconds : repos entre les séries, entre ${preset.restMin} et ${preset.restMax} secondes (typique : ${preset.rest})
Le temps total de la séance est la somme de sets × (durationSeconds + restSeconds) : vise ${params.durationMinutes} minutes.
Donne aussi un "name" court en français pour la séance (60 caractères maximum).

Exercices disponibles :
${JSON.stringify(candidates.map((c) => ({ id: c.id, name: c.name, group: c.group, target: c.target, equipment: c.equipment })))}`;
};

// Transforme la réponse de l'IA en séance fiable : ids inconnus ignorés,
// doublons retirés, valeurs bornées, puis ajustement à la durée demandée.
// Renvoie null si la réponse est inutilisable (=> repli sur les règles).
const sanitizeAiPlan = (aiPlan, pool, params, warnings = []) => {
  if (!aiPlan || !Array.isArray(aiPlan.exercises)) return null;
  const preset = getPreset(params.goal, params.level);
  const seen = new Set();
  const items = [];

  for (const entry of aiPlan.exercises) {
    if (items.length >= MAX_EXERCISES) break;
    const id = normalizeExerciseId(entry?.exerciseId ?? entry?.id);
    const exercise = pool.byId.get(id);
    if (!exercise || seen.has(id)) continue;
    seen.add(id);
    items.push({
      exercise,
      sets: clamp(toInt(entry.sets, preset.sets), preset.minSets, preset.maxSets),
      work: clamp(roundTo5(toInt(entry.durationSeconds, preset.work)), preset.workMin, preset.workMax),
      rest: clamp(roundTo5(toInt(entry.restSeconds, preset.rest)), preset.restMin, preset.restMax),
    });
  }
  if (items.length < MIN_EXERCISES) return null;

  const fitted = fitToDuration(items, params.durationMinutes * 60, preset, []);
  const rawName = typeof aiPlan.name === "string" ? aiPlan.name.trim().slice(0, 80) : "";
  return toResult(fitted, params, "ai", warnings, rawName || undefined);
};

module.exports = {
  GOALS,
  LEVELS,
  LOCATIONS,
  FOCUSES,
  GOAL_LABELS,
  FOCUS_LABELS,
  MIN_DURATION_MIN,
  MAX_DURATION_MIN,
  MIN_EXERCISES,
  MAX_EXERCISES,
  PlannerError,
  validateParams,
  getPreset,
  initialExerciseCount,
  groupOf,
  equipmentTier,
  buildPool,
  buildPoolWithFallback,
  selectExercises,
  fitToDuration,
  planWithRules,
  buildAiCandidates,
  buildAiPrompt,
  sanitizeAiPlan,
  totalSeconds,
  mulberry32,
};
