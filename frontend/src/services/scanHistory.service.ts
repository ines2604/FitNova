import api from "./api";
import { ScanHistoryEntry, ScanHistoryType, FoodProduct } from "@/types/nutrition";

/** Récupère l'historique des repas analysés (photo et/ou code-barres). */
export const getScanHistory = async (type?: ScanHistoryType): Promise<ScanHistoryEntry[]> => {
  const { data } = await api.get("/nutrition/history", {
    params: type ? { type } : undefined,
  });
  return data as ScanHistoryEntry[];
};

/** Récupère une entrée précise de l'historique. */
export const getScanHistoryEntry = async (id: number | string): Promise<ScanHistoryEntry> => {
  const { data } = await api.get(`/nutrition/history/${id}`);
  return data as ScanHistoryEntry;
};

/** Supprime une entrée de l'historique. */
export const deleteScanHistoryEntry = async (id: number | string): Promise<void> => {
  await api.delete(`/nutrition/history/${id}`);
};

/**
 * Enregistre dans l'historique un produit trouvé via le scanner code-barres.
 * (L'analyse photo, elle, est déjà enregistrée automatiquement côté backend
 * lors de l'appel à /nutrition/scan-meal.)
 */
export const saveBarcodeScanToHistory = async (
  product: FoodProduct
): Promise<ScanHistoryEntry> => {
  const { data } = await api.post("/nutrition/history", {
    scanType: "barcode",
    title: product.name,
    imageUrl: product.imageUrl,
    barcode: product.id,
    calories: product.caloriesPer100g,
    protein: product.proteinPer100g,
    carbs: product.carbsPer100g,
    fat: product.fatPer100g,
    nutriScore: product.nutriScore,
  });
  return data as ScanHistoryEntry;
};
