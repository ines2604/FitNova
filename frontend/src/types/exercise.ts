// Exercice du catalogue. Les noms de champs sont ceux du dataset
// https://github.com/shahanbutt/exercises-dataset (data/exercises.json).
// Les valeurs (body_part, equipment, target, muscles) sont en anglais dans le
// dataset : utiliser utils/exerciseLabels.ts pour les afficher en français.
export type Exercise = {
  /** Identifiant du dataset, en texte pour garder les zéros initiaux ("0025"). */
  id: string;
  name: string;
  body_part: string;
  equipment: string;
  /** Muscle ciblé principal (ex. "biceps", "pectorals"). */
  target: string;
  /** Groupe musculaire synergiste principal. */
  muscle_group: string;
  secondary_muscles: string[];
  /** URL absolue de la vignette 180×180 (.jpg). */
  image: string;
  /** URL absolue du GIF animé 180×180. */
  gif_url: string;
  created_at: string | null;
  /**
   * Uniquement sur la fiche détaillée (GET /exercises/:id) : texte complet par
   * langue. Le backend ne renvoie que le français (avec repli sur l'anglais).
   */
  instructions?: Record<string, string>;
};

export type ExerciseFilterOptions = {
  bodyParts: string[];
  equipments: string[];
};

export type ExerciseSearchParams = {
  q?: string;
  bodyPart?: string;
  equipment?: string;
  page?: number;
  limit?: number;
};

export type ExerciseSearchResult = {
  items: Exercise[];
  total: number;
  page: number;
  limit: number;
};
