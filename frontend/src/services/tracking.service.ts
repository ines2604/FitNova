import api from "./api";
import { DailyTracking } from "../types/tracking";

// GET /api/tracking?date=YYYY-MM-DD — récupère (ou crée) le suivi du jour
export const getDailyTracking = async (
  date?: string
): Promise<DailyTracking> => {
  const { data } = await api.get("/tracking", {
    params: date ? { date } : undefined,
  });
  return data as DailyTracking;
};

// POST /api/tracking/water — ajoute (ou retire, avec un montant négatif)
// une quantité d'eau (en ml) au suivi du jour
export const logWater = async (
  amountMl: number,
  date?: string
): Promise<DailyTracking> => {
  const { data } = await api.post("/tracking/water", { amountMl, date });
  return data as DailyTracking;
};

// POST /api/tracking/steps
export const logSteps = async (
  steps: number,
  date?: string
): Promise<DailyTracking> => {
  const { data } = await api.post("/tracking/steps", { steps, date });
  return data as DailyTracking;
};

// POST /api/tracking/calories-burned
export const logCaloriesBurned = async (
  calories: number,
  date?: string
): Promise<DailyTracking> => {
  const { data } = await api.post("/tracking/calories-burned", {
    calories,
    date,
  });
  return data as DailyTracking;
};

// POST /api/tracking/sleep — enregistre l'heure de coucher et de réveil
// (dates ISO complètes) ; le backend calcule la durée de sommeil
export const logSleep = async (
  bedtime: string,
  wakeTime: string,
  date?: string
): Promise<DailyTracking> => {
  const { data } = await api.post("/tracking/sleep", {
    bedtime,
    wakeTime,
    date,
  });
  return data as DailyTracking;
};
