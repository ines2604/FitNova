export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export type MealSource = "manual" | "barcode" | "photo";

export type MealEntry = {
  id: number;
  user_id: number;
  date: string;
  meal_type: MealType;
  name: string;
  image_url: string | null;
  calories: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  source: MealSource;
  barcode: string | null;
  created_at: string;
};

export type AddMealInput = {
  date: string;
  mealType: MealType;
  name: string;
  imageUrl?: string | null;
  calories: number;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  source?: MealSource;
  barcode?: string | null;
};

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "Petit-déjeuner",
  lunch: "Déjeuner",
  dinner: "Dîner",
  snack: "Collation",
};

export const MEAL_TYPE_ICONS: Record<MealType, string> = {
  breakfast: "cafe-outline",
  lunch: "restaurant-outline",
  dinner: "moon-outline",
  snack: "pizza-outline",
};
