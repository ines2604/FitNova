import api from "./api";
import {
  Exercise,
  ExerciseFilterOptions,
  ExerciseSearchParams,
  ExerciseSearchResult,
} from "@/types/exercise";

/** Recherche/filtre le catalogue d'exercices, avec pagination. */
export const searchExercises = async (
  params: ExerciseSearchParams
): Promise<ExerciseSearchResult> => {
  const { data } = await api.get("/exercises", { params });
  return data as ExerciseSearchResult;
};

/** Valeurs disponibles pour construire les filtres (parties du corps, équipements). */
export const getExerciseFilters = async (): Promise<ExerciseFilterOptions> => {
  const { data } = await api.get("/exercises/filters");
  return data as ExerciseFilterOptions;
};

/** Fiche détaillée d'un exercice. */
export const getExerciseById = async (id: number | string): Promise<Exercise> => {
  const { data } = await api.get(`/exercises/${id}`);
  return data as Exercise;
};

/** Exercices favoris de l'utilisateur, avec leurs détails complets (les plus récents d'abord). */
export const getFavoriteExercises = async (): Promise<{ items: Exercise[]; total: number }> => {
  const { data } = await api.get("/exercises/favorites");
  return data as { items: Exercise[]; total: number };
};