import { FoodProduct } from "@/types/nutrition";

// Portion d'un aliment (recherche d'aliments ou scan de code-barres).
// Open Food Facts ne donne les valeurs nutritionnelles que « pour 100 g » :
// on les ramène à la quantité réellement mangée avant de les enregistrer.

export const DEFAULT_PORTION_GRAMS = 100;
export const MIN_PORTION_GRAMS = 1;
export const MAX_PORTION_GRAMS = 2000;
export const PORTION_STEP_GRAMS = 10;
export const PORTION_PRESETS = [50, 100, 150, 200, 250];

export const clampPortion = (grams: number): number => {
  if (!Number.isFinite(grams)) return DEFAULT_PORTION_GRAMS;
  return Math.min(MAX_PORTION_GRAMS, Math.max(MIN_PORTION_GRAMS, Math.round(grams)));
};

const scale = (per100g: number | null | undefined, grams: number): number | null =>
  per100g == null ? null : Math.round(((per100g * grams) / 100) * 10) / 10;

export type PortionNutrition = {
  calories: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
};

/** Calories et macros d'une portion de `grams` grammes du produit. */
export const scaleNutrition = (product: FoodProduct, grams: number): PortionNutrition => ({
  calories: Math.round(((product.caloriesPer100g || 0) * grams) / 100),
  protein: scale(product.proteinPer100g, grams),
  carbs: scale(product.carbsPer100g, grams),
  fat: scale(product.fatPer100g, grams),
});

// La colonne `meals.name` est un VARCHAR(255) côté MySQL.
const MEAL_NAME_MAX_LENGTH = 255;

/** Nom enregistré dans le suivi, avec la quantité : « Yaourt nature (150 g) ». */
export const portionMealName = (name: string, grams: number): string => {
  const suffix = ` (${grams} g)`;
  return `${name.slice(0, MEAL_NAME_MAX_LENGTH - suffix.length)}${suffix}`;
};
