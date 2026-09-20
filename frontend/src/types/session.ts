export type SessionExercise = {
  id: number;
  session_id: number;
  /** Id de l'exercice dans le catalogue (texte du dataset, ex. "0025"). */
  exercise_id: string;
  order_index: number;
  sets: number;
  duration_seconds: number | null;
  rest_seconds: number;
  exercise_name: string;
  image: string | null;
  body_part: string;
  equipment: string | null;
};

export type WorkoutSession = {
  id: number;
  user_id: number;
  name: string;
  created_at: string;
  updated_at: string;
  exercises: SessionExercise[];
};

export type WorkoutSessionSummary = {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  exercise_count: number;
  /** Durée totale estimée (séries × (durée + repos) de chaque exercice), en secondes. */
  total_duration_seconds: number;
};

export type SessionSort = "recent" | "duration_asc" | "duration_desc";

export type SessionExerciseInput = {
  exerciseId: string;
  sets?: number;
  durationSeconds?: number | null;
  restSeconds?: number;
};

export type CreateSessionInput = {
  name: string;
  exercises: SessionExerciseInput[];
};

// ============ Génération automatique de séance ============

export type WorkoutGoal = "weight_loss" | "muscle_gain" | "maintenance";
export type WorkoutLevel = "beginner" | "intermediate" | "advanced";
export type WorkoutLocation = "home_bodyweight" | "home_equipment" | "gym";
export type WorkoutFocus = "full_body" | "upper_body" | "lower_body" | "core";

export type GenerateSessionInput = {
  /** Par défaut : l'objectif du profil. */
  goal?: WorkoutGoal;
  level: WorkoutLevel;
  location: WorkoutLocation;
  focus: WorkoutFocus;
  /** Entier de 10 à 90. */
  durationMinutes: number;
  /** false = génération par règles uniquement, sans appel à l'IA. */
  useAi?: boolean;
};

export type GeneratedExercise = {
  exerciseId: string;
  name: string;
  image: string | null;
  bodyPart: string;
  equipment: string | null;
  sets: number;
  durationSeconds: number;
  restSeconds: number;
};

export type GeneratedSession = {
  name: string;
  /** "ai" : choisie par l'IA ; "rules" : générée par règles (repli ou useAi=false). */
  source: "ai" | "rules";
  targetSeconds: number;
  totalSeconds: number;
  warnings: string[];
  exercises: GeneratedExercise[];
};
