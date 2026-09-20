import api from "./api";
import { FastEntry } from "@/types/fasting";

/** Le jeûne en cours (actif) ou le prochain planifié, s'il y en a un. */
export const getCurrentFast = async (): Promise<FastEntry | null> => {
  const { data } = await api.get("/fasting/current");
  return data;
};

/** Historique des jeûnes d'un mois donné (format "AAAA-MM"), pour le calendrier. */
export const getFastingCalendar = async (month: string): Promise<FastEntry[]> => {
  const { data } = await api.get("/fasting", { params: { month } });
  return data;
};

/** Heures de jeûne réellement tenues par jour, pour le graphique de la page profil. */
export const getFastingStats = async (
  days = 370
): Promise<{ date: string; hours: number }[]> => {
  const { data } = await api.get("/fasting/stats", { params: { days } });
  return data;
};

/** Planifie un jeûne à venir. */
export const planFast = async (
  planDate: string,
  startTime: string,
  durationHours: number
): Promise<FastEntry> => {
  const { data } = await api.post("/fasting/plan", {
    planDate,
    startTime,
    durationHours,
  });
  return data;
};

/** Démarre un jeûne déjà planifié (par id) ou un jeûne instantané (par durée). */
export const startFast = async (params: {
  id?: number;
  durationHours?: number;
}): Promise<FastEntry> => {
  const { data } = await api.post("/fasting/start", params);
  return data;
};

/** Termine un jeûne actif. */
export const endFast = async (id: number): Promise<FastEntry> => {
  const { data } = await api.post(`/fasting/${id}/end`);
  return data;
};

/** Annule un jeûne planifié ou actif. */
export const cancelFast = async (id: number): Promise<FastEntry> => {
  const { data } = await api.post(`/fasting/${id}/cancel`);
  return data;
};
