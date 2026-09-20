export type ScheduledSessionStatus =
  | "planned"
  | "in_progress"
  | "paused"
  | "completed"
  | "cancelled"
  | "missed";

export type ScheduledSession = {
  id: number;
  user_id: number;
  session_id: number;
  session_name: string;
  scheduled_date: string;
  scheduled_time: string;
  status: ScheduledSessionStatus;
  started_at: string | null;
  ended_at: string | null;
  /** Temps réellement passé dans le lecteur de séance (secondes). */
  actual_duration_seconds: number | null;
  calories_burned: number | null;
  created_at: string;
  duration_minutes?: number | null;
};

export const WORKOUT_STATUS_COLORS: Record<ScheduledSessionStatus, string> = {
  planned: "#407BFF",
  in_progress: "#F59E0B",
  paused: "#FB923C",
  completed: "#22C55E",
  cancelled: "#94A3B8",
  missed: "#94A3B8",
};

export const WORKOUT_STATUS_LABELS: Record<ScheduledSessionStatus, string> = {
  planned: "Planifiée",
  in_progress: "En cours",
  paused: "En pause",
  completed: "Terminée",
  cancelled: "Annulée",
  missed: "Manquée",
};

export const formatSessionTimeHM = (value: string) => value.slice(0, 5);

export const scheduledSessionStartAt = (entry: ScheduledSession): Date => {
  const hm = formatSessionTimeHM(entry.scheduled_time);
  return new Date(`${entry.scheduled_date}T${hm}:00`);
};

export const isOpenWorkoutStatus = (status: ScheduledSessionStatus) =>
  status === "in_progress" || status === "paused";
