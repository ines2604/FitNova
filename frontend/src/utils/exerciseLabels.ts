// Le dataset d'exercices (https://github.com/shahanbutt/exercises-dataset)
// fournit ses valeurs en anglais ("upper legs", "dumbbell", "pectorals"...).
// La base et l'API gardent ces valeurs telles quelles (elles servent de clés
// pour les filtres) ; ces tables ne servent qu'à l'AFFICHAGE en français.
// Une valeur inconnue (ajoutée plus tard au dataset) est affichée telle quelle,
// avec une majuscule, plutôt que de casser l'écran.

const BODY_PART_FR: Record<string, string> = {
  back: "Dos",
  cardio: "Cardio",
  chest: "Pectoraux",
  "lower arms": "Avant-bras",
  "lower legs": "Bas des jambes",
  neck: "Cou",
  shoulders: "Épaules",
  "upper arms": "Bras",
  "upper legs": "Cuisses",
  waist: "Taille / abdos",
};

const EQUIPMENT_FR: Record<string, string> = {
  assisted: "Assisté",
  band: "Bande élastique",
  barbell: "Barre",
  "body weight": "Poids du corps",
  "bosu ball": "Ballon Bosu",
  cable: "Poulie",
  dumbbell: "Haltère",
  "elliptical machine": "Vélo elliptique",
  "ez barbell": "Barre EZ",
  hammer: "Marteau",
  kettlebell: "Kettlebell",
  "leverage machine": "Machine à leviers",
  "medicine ball": "Médecine-ball",
  "olympic barbell": "Barre olympique",
  "resistance band": "Bande de résistance",
  roller: "Rouleau",
  rope: "Corde",
  "skierg machine": "Machine SkiErg",
  "sled machine": "Machine à traîneau",
  "smith machine": "Machine Smith",
  "stability ball": "Ballon de stabilité",
  "stationary bike": "Vélo stationnaire",
  "stepmill machine": "Simulateur d'escaliers",
  tire: "Pneu",
  "trap bar": "Barre hexagonale",
  "upper body ergometer": "Ergomètre haut du corps",
  weighted: "Lesté",
  "wheel roller": "Roue abdominale",
};

// Valables pour `target`, `muscle_group` et `secondary_muscles`.
const MUSCLE_FR: Record<string, string> = {
  abductors: "Abducteurs",
  abs: "Abdominaux",
  abdominals: "Abdominaux",
  adductors: "Adducteurs",
  "ankle stabilizers": "Stabilisateurs de la cheville",
  ankles: "Chevilles",
  back: "Dos",
  biceps: "Biceps",
  brachialis: "Brachial",
  calves: "Mollets",
  "cardiovascular system": "Système cardiovasculaire",
  chest: "Pectoraux",
  core: "Tronc (gainage)",
  deltoids: "Deltoïdes",
  delts: "Deltoïdes",
  feet: "Pieds",
  forearms: "Avant-bras",
  glutes: "Fessiers",
  groin: "Aine",
  "grip muscles": "Muscles de préhension",
  hamstrings: "Ischio-jambiers",
  hands: "Mains",
  "hip flexors": "Fléchisseurs de la hanche",
  "inner thighs": "Intérieur des cuisses",
  lats: "Grands dorsaux",
  "latissimus dorsi": "Grand dorsal",
  "levator scapulae": "Élévateur de la scapula",
  "lower abs": "Bas des abdominaux",
  "lower back": "Bas du dos",
  obliques: "Obliques",
  pectorals: "Pectoraux",
  quads: "Quadriceps",
  quadriceps: "Quadriceps",
  "rear deltoids": "Deltoïdes postérieurs",
  rhomboids: "Rhomboïdes",
  "rotator cuff": "Coiffe des rotateurs",
  "serratus anterior": "Dentelé antérieur",
  shins: "Tibias",
  shoulders: "Épaules",
  soleus: "Soléaire",
  spine: "Colonne vertébrale",
  sternocleidomastoid: "Sterno-cléido-mastoïdien",
  traps: "Trapèzes",
  trapezius: "Trapèzes",
  triceps: "Triceps",
  "upper back": "Haut du dos",
  "upper chest": "Haut des pectoraux",
  "wrist extensors": "Extenseurs du poignet",
  "wrist flexors": "Fléchisseurs du poignet",
  wrists: "Poignets",
};

const capitalizeFirst = (value: string): string =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : value;

const translate = (table: Record<string, string>, value?: string | null): string => {
  if (!value) return "";
  return table[value.trim().toLowerCase()] ?? capitalizeFirst(value);
};

export const bodyPartLabel = (value?: string | null) => translate(BODY_PART_FR, value);
export const equipmentLabel = (value?: string | null) => translate(EQUIPMENT_FR, value);
export const muscleLabel = (value?: string | null) => translate(MUSCLE_FR, value);

/** Les noms du dataset sont en minuscules ("barbell bench press") : on met la 1re lettre en majuscule. */
export const formatExerciseName = (name?: string | null): string => capitalizeFirst(name ?? "");

/**
 * Découpe le texte des instructions en étapes (une phrase par étape) pour les
 * afficher en liste numérotée. Le dataset ne fournit qu'un texte continu.
 */
export const splitInstructionSteps = (text?: string | null): string[] =>
  ((text ?? "").match(/[^.!?]+(?:[.!?]+|$)/g) ?? []).map((s) => s.trim()).filter(Boolean);

/** Mention de copyright exigée par les conditions d'utilisation des médias du dataset (Gym visual). */
export const MEDIA_ATTRIBUTION = "© Gym visual — https://gymvisual.com/";
