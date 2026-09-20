import api from "./api";
import { ScheduledSession, ScheduledSessionStatus } from "@/types/scheduledSession";

const extractMessage = (error: unknown): string => {
  const e = error as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message || e?.message || "Erreur réseau";
};

export const scheduleSession = async (input: {
  sessionId: number;
  date: string;
  time: string;
}): Promise<ScheduledSession> => {
  try {
    const { data } = await api.post("/calendar", input);
    return data as ScheduledSession;
  } catch (error) {
    throw new Error(extractMessage(error));
  }
};

export const startSessionNow = async (sessionId: number): Promise<ScheduledSession> => {
  try {
    const { data } = await api.post("/calendar/start-now", { sessionId });
    return data as ScheduledSession;
  } catch (error) {
    throw new Error(extractMessage(error));
  }
};

export const getWorkoutCalendar = async (from: string, to: string): Promise<ScheduledSession[]> => {
  const { data } = await api.get("/calendar", { params: { from, to } });
  return data as ScheduledSession[];
};

export const getScheduledSessionById = async (id: number | string): Promise<ScheduledSession> => {
  const { data } = await api.get(`/calendar/${id}`);
  return data as ScheduledSession;
};

export const startScheduledSession = async (id: number | string): Promise<ScheduledSession> => {
  try {
    const { data } = await api.patch(`/calendar/${id}/start`);
    return data as ScheduledSession;
  } catch (error) {
    throw new Error(extractMessage(error));
  }
};

export const pauseScheduledSession = async (id: number | string): Promise<ScheduledSession> => {
  try {
    const { data } = await api.patch(`/calendar/${id}/pause`);
    return data as ScheduledSession;
  } catch (error) {
    throw new Error(extractMessage(error));
  }
};

export const cancelScheduledSession = async (
  id: number | string,
  actualDurationSeconds?: number
): Promise<ScheduledSession> => {
  try {
    const { data } = await api.patch(`/calendar/${id}/cancel`, {
      actualDurationSeconds,
    });
    return data as ScheduledSession;
  } catch (error) {
    throw new Error(extractMessage(error));
  }
};

export const finishScheduledSession = async (
  id: number | string,
  actualDurationSeconds: number
): Promise<ScheduledSession> => {
  try {
    const { data } = await api.patch(`/calendar/${id}/finish`, { actualDurationSeconds });
    return data as ScheduledSession;
  } catch (error) {
    throw new Error(extractMessage(error));
  }
};

export const removeScheduledSession = async (id: number | string): Promise<void> => {
  await api.delete(`/calendar/${id}`);
};

export const findActiveScheduledSession = async (): Promise<ScheduledSession | null> => {
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 14);
  const to = new Date(now);
  to.setDate(to.getDate() + 1);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const rows = await getWorkoutCalendar(fmt(from), fmt(to));
  return rows.find((r) => r.status === "in_progress" || r.status === "paused") || null;
};

export const getWorkoutHistory = async (params?: {
  from?: string;
  to?: string;
  status?: ScheduledSessionStatus;
}): Promise<ScheduledSession[]> => {
  const { data } = await api.get("/calendar/history", { params });
  return data as ScheduledSession[];
};

export const getWorkoutDurationStats = async (
  days = 370
): Promise<{ date: string; minutes: number }[]> => {
  const { data } = await api.get("/calendar/stats", { params: { days } });
  return data as { date: string; minutes: number }[];
};
