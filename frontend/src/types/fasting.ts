export type FastStatus = "planned" | "active" | "completed" | "cancelled";

export type FastEntry = {
  id: number;
  user_id: number;
  plan_date: string; // "AAAA-MM-JJ"
  planned_start_time: string; // "HH:mm:ss"
  planned_end_time: string; // "HH:mm:ss"
  duration_hours: number;
  status: FastStatus;
  actual_start_at: string | null; // "AAAA-MM-JJ HH:mm:ss"
  actual_end_at: string | null;
  actual_duration_minutes: number | null;
  created_at: string;
};

export type FastPreset = {
  key: string;
  label: string;
  fastingHours: number;
  eatingHours: number;
  description: string;
};

export const FAST_PRESETS: FastPreset[] = [
  {
    key: "14-10",
    label: "14:10",
    fastingHours: 14,
    eatingHours: 10,
    description: "En douceur, pour débuter le jeûne intermittent.",
  },
  {
    key: "16-8",
    label: "16:8",
    fastingHours: 16,
    eatingHours: 8,
    description: "Le format le plus populaire et le plus étudié.",
  },
  {
    key: "18-6",
    label: "18:6",
    fastingHours: 18,
    eatingHours: 6,
    description: "Un cran plus intense, pour les habitués du 16:8.",
  },
  {
    key: "20-4",
    label: "20:4",
    fastingHours: 20,
    eatingHours: 4,
    description: "Fenêtre alimentaire courte, façon 'Guerrier'.",
  },
  {
    key: "omad",
    label: "OMAD 23:1",
    fastingHours: 23,
    eatingHours: 1,
    description: "Un seul repas par jour, pour les plus expérimentés.",
  },
];

export const STATUS_LABELS: Record<FastStatus, string> = {
  planned: "Planifié",
  active: "En cours",
  completed: "Terminé",
  cancelled: "Annulé",
};

export const STATUS_COLORS: Record<FastStatus, string> = {
  planned: "#407BFF",
  active: "#F08A24",
  completed: "#1E8F4E",
  cancelled: "#EF4444",
};

// Convertit "AAAA-MM-JJ HH:mm:ss" en timestamp. Le serveur enregistre ces
// horodatages en heure de Tunisie (UTC+1 toute l'année) : on les lit avec ce
// décalage explicite, sinon le temps écoulé serait faux sur un appareil réglé
// sur un autre fuseau.
const TUNIS_UTC_OFFSET = "+01:00";
const parseLocalDateTime = (value: string) =>
  new Date(`${value.trim().replace(" ", "T").slice(0, 19)}${TUNIS_UTC_OFFSET}`).getTime();

export type FastTiming = {
  elapsedMs: number;
  remainingMs: number;
  progress: number; // 0..1, peut dépasser via isOvertime
  isOvertime: boolean;
  endAt: Date | null;
};

// Calcule le temps écoulé/restant d'un jeûne actif à partir de son
// horodatage réel de départ (`actual_start_at`) et de sa durée cible. Pour
// un jeûne simplement planifié (pas encore démarré), tout est à zéro.
export const getFastTiming = (fast: FastEntry, now: number = Date.now()): FastTiming => {
  const durationMs = fast.duration_hours * 60 * 60 * 1000;

  if (fast.status === "active" && fast.actual_start_at) {
    const startMs = parseLocalDateTime(fast.actual_start_at);
    const elapsedMs = Math.max(0, now - startMs);
    const remainingMs = Math.max(0, durationMs - elapsedMs);
    return {
      elapsedMs,
      remainingMs,
      progress: durationMs > 0 ? elapsedMs / durationMs : 0,
      isOvertime: elapsedMs > durationMs,
      endAt: new Date(startMs + durationMs),
    };
  }

  return {
    elapsedMs: 0,
    remainingMs: durationMs,
    progress: 0,
    isOvertime: false,
    endAt: null,
  };
};

export const formatDurationHM = (ms: number) => {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}min`;
};

export const formatTimeHM = (value: string) => value.slice(0, 5);
