import api from "./api";
import { AddMealInput, MealEntry } from "@/types/meal";

// GET /api/meals?date=YYYY-MM-DD
export const getMealsByDate = async (date: string): Promise<MealEntry[]> => {
  const { data } = await api.get("/meals", { params: { date } });
  return data as MealEntry[];
};

// POST /api/meals — ajoute un aliment consommé (manuel, code-barres ou photo)
export const addMeal = async (input: AddMealInput): Promise<MealEntry> => {
  const { data } = await api.post("/meals", input);
  return data as MealEntry;
};

// DELETE /api/meals/:id
export const deleteMeal = async (id: number): Promise<void> => {
  await api.delete(`/meals/${id}`);
};
