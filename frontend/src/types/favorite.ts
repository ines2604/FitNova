import { NutriScore } from "@/types/nutrition";

export type FavoriteItemType = "food" | "recipe" | "exercise";

export type FavoriteSource = "aliment" | "barcode" | "photo" | "repas" | "exercice";

export type FavoriteEntry = {
  id: number;
  user_id: number;
  item_type: FavoriteItemType;
  ref_id: string | null;
  name: string;
  image_url: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  nutri_score: NutriScore;
  source: FavoriteSource;
  created_at: string;
};

export type AddFavoriteInput = {
  itemType: FavoriteItemType;
  refId?: string | null;
  name: string;
  imageUrl?: string | null;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  nutriScore?: NutriScore;
  source?: FavoriteSource;
};
