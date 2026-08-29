import api from "./api";
import { MealScanResult } from "@/types/nutrition";

/**
 * Envoie une photo de repas au backend, qui l'analyse via Gemini Vision
 * et renvoie les aliments détectés + une estimation calories/macros.
 */
export const scanMealPhoto = async (uri: string): Promise<MealScanResult> => {
  const formData = new FormData();
  const extension = uri.split(".").pop()?.toLowerCase() || "jpg";
  const mimeType =
    extension === "png" ? "image/png" : extension === "webp" ? "image/webp" : "image/jpeg";

  formData.append("photo", {
    uri,
    type: mimeType,
    name: `meal.${extension}`,
  } as unknown as Blob);

  const { data } = await api.post("/nutrition/scan-meal", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 30000,
  });

  return data as MealScanResult;
};