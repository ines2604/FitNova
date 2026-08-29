import axios from "axios";
import { MealCategory, MealDetail, MealIngredient, MealSummary } from "@/types/nutrition";

// API publique et gratuite TheMealDB (clé de test "1" fournie par l'éditeur
// pour un usage non commercial). Doc : https://www.themealdb.com/api.php
const BASE_URL = "https://www.themealdb.com/api/json/v1/1";

const mealDb = axios.create({ baseURL: BASE_URL, timeout: 15000 });

const mapSummary = (m: any): MealSummary => ({
  id: m.idMeal,
  name: m.strMeal,
  thumbnail: m.strMealThumb || null,
  category: m.strCategory || null,
  area: m.strArea || null,
});

const mapDetail = (m: any): MealDetail => {
  const ingredients: MealIngredient[] = [];
  for (let i = 1; i <= 20; i += 1) {
    const ingredient = m[`strIngredient${i}`];
    const measure = m[`strMeasure${i}`];
    if (ingredient && ingredient.trim()) {
      ingredients.push({ ingredient: ingredient.trim(), measure: (measure || "").trim() });
    }
  }

  return {
    ...mapSummary(m),
    instructions: m.strInstructions || null,
    tags: (m.strTags || "").split(",").map((t: string) => t.trim()).filter(Boolean),
    youtubeUrl: m.strYoutube || null,
    sourceUrl: m.strSource || null,
    ingredients,
  };
};

/** Recherche de repas par nom (recherche libre). */
export const searchMealsByName = async (query: string): Promise<MealSummary[]> => {
  const { data } = await mealDb.get("/search.php", { params: { s: query } });
  return (data.meals || []).map(mapSummary);
};

/** Recherche de repas par première lettre du nom. */
export const searchMealsByFirstLetter = async (letter: string): Promise<MealSummary[]> => {
  const { data } = await mealDb.get("/search.php", { params: { f: letter } });
  return (data.meals || []).map(mapSummary);
};

/** Détails complets d'un repas (ingrédients, instructions, vidéo...). */
export const getMealById = async (id: string): Promise<MealDetail | null> => {
  const { data } = await mealDb.get("/lookup.php", { params: { i: id } });
  const meal = data.meals?.[0];
  return meal ? mapDetail(meal) : null;
};

/** Repas aléatoire — pratique pour « inspire-moi » un repas. */
export const getRandomMeal = async (): Promise<MealDetail | null> => {
  const { data } = await mealDb.get("/random.php");
  const meal = data.meals?.[0];
  return meal ? mapDetail(meal) : null;
};

/** Filtre les repas par catégorie (ex: Vegetarian, Seafood, Dessert...). */
export const filterMealsByCategory = async (category: string): Promise<MealSummary[]> => {
  const { data } = await mealDb.get("/filter.php", { params: { c: category } });
  return (data.meals || []).map(mapSummary);
};

/** Filtre les repas par origine géographique (ex: Italian, French...). */
export const filterMealsByArea = async (area: string): Promise<MealSummary[]> => {
  const { data } = await mealDb.get("/filter.php", { params: { a: area } });
  return (data.meals || []).map(mapSummary);
};

/** Filtre les repas par ingrédient principal (ex: chicken_breast). */
export const filterMealsByIngredient = async (ingredient: string): Promise<MealSummary[]> => {
  const { data } = await mealDb.get("/filter.php", { params: { i: ingredient } });
  return (data.meals || []).map(mapSummary);
};

/** Liste des catégories disponibles (avec description et image). */
export const getMealCategories = async (): Promise<MealCategory[]> => {
  const { data } = await mealDb.get("/categories.php");
  return (data.categories || []).map((c: any) => ({
    id: c.idCategory,
    name: c.strCategory,
    thumbnail: c.strCategoryThumb || null,
    description: c.strCategoryDescription || null,
  }));
};

/** Liste des zones géographiques (cuisines) disponibles. */
export const getMealAreas = async (): Promise<string[]> => {
  const { data } = await mealDb.get("/list.php", { params: { a: "list" } });
  return (data.meals || []).map((a: any) => a.strArea).filter(Boolean);
};

const ALPHABET = "abcdefghijklmnopqrstuvwxyz".split("");

/** Mélange un tableau (Fisher-Yates) sans muter l'original. */
const shuffle = <T,>(arr: T[]): T[] => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

/**
 * Récupère un lot de repas aléatoires à afficher avant toute recherche
 * (ex : 50 repas à faire défiler). TheMealDB n'offrant pas d'endpoint de
 * liste aléatoire en masse, on pioche quelques lettres au hasard, on
 * combine les résultats de /search.php?f=lettre, on mélange et on tronque.
 */
export const getRandomMealsPool = async (count = 50): Promise<MealSummary[]> => {
  const letters = shuffle(ALPHABET).slice(0, 6);
  const results = await Promise.all(
    letters.map((l) => searchMealsByFirstLetter(l).catch(() => []))
  );

  const seen = new Set<string>();
  const merged: MealSummary[] = [];
  for (const meal of results.flat()) {
    if (meal?.id && !seen.has(meal.id)) {
      seen.add(meal.id);
      merged.push(meal);
    }
  }

  return shuffle(merged).slice(0, count);
};