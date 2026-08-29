// ---- Open Food Facts ----

export type NutriScore = "a" | "b" | "c" | "d" | "e" | null;

export type FoodProduct = {
  id: string; // code-barres (barcode)
  name: string;
  brand: string | null;
  imageUrl: string | null;
  quantity: string | null;
  categories: string | null;
  caloriesPer100g: number | null;
  proteinPer100g: number | null;
  carbsPer100g: number | null;
  fatPer100g: number | null;
  sugarsPer100g: number | null;
  fiberPer100g: number | null;
  saltPer100g: number | null;
  nutriScore: NutriScore;
  novaGroup: number | null;
  ingredientsText: string | null;
  allergens: string[];
  labels: string | null; // ex: "Vegan, Sans gluten, Bio"
};

export type FoodSortBy =
  | "relevance"
  | "calories_asc"
  | "calories_desc"
  | "protein_desc"
  | "nutriscore";

export type FoodSearchFilters = {
  query?: string;
  category?: string; // ex: "beverages", "snacks"
  nutritionGrade?: string; // "a" | "b" | "c" | "d" | "e"
  dietLabel?: string; // ex: "vegan", "vegetarian", "gluten-free"
  minCalories?: number;
  maxCalories?: number;
  sortBy?: FoodSortBy;
  page?: number;
  pageSize?: number;
};

export type FoodSearchResult = {
  products: FoodProduct[];
  page: number;
  pageCount: number;
  totalCount: number;
};

// ---- TheMealDB ----

export type MealSummary = {
  id: string;
  name: string;
  thumbnail: string | null;
  category?: string | null;
  area?: string | null;
};

export type MealIngredient = {
  ingredient: string;
  measure: string;
};

export type MealDetail = MealSummary & {
  instructions: string | null;
  tags: string[];
  youtubeUrl: string | null;
  sourceUrl: string | null;
  ingredients: MealIngredient[];
};

export type MealSearchMode = "name" | "category" | "area" | "ingredient";

// ---- Scan de repas par photo (Gemini Vision) ----

export type MealScanItem = {
  name: string;
  quantity: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type MealScanConfidence = "low" | "medium" | "high";

export type MealScanResult = {
  photoUrl: string;
  items: MealScanItem[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  confidence: MealScanConfidence;
  note: string;
};

// ---- Historique des repas analysés (photo + code-barres) ----

export type ScanHistoryType = "photo" | "barcode";

export type ScanHistoryEntry = {
  id: number;
  user_id: number;
  scan_type: ScanHistoryType;
  title: string;
  image_url: string | null;
  barcode: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  nutri_score: NutriScore;
  confidence: MealScanConfidence | null;
  details: { items?: MealScanItem[]; note?: string } | null;
  created_at: string;
};

export type MealCategory = {
  id: string;
  name: string;
  thumbnail: string | null;
  description: string | null;
};