
import api from "./api";
import {
  WorkoutSession,
  WorkoutSessionSummary,
  CreateSessionInput,
  SessionSort,
  GenerateSessionInput,
  GeneratedSession,
} from "@/types/session";

export const createSession = async (input: CreateSessionInput): Promise<WorkoutSession> => {
  const { data } = await api.post("/sessions", input);
  return data as WorkoutSession;
};

export const getSessions = async (
  q?: string,
  sort?: SessionSort
): Promise<WorkoutSessionSummary[]> => {
  const { data } = await api.get("/sessions", { params: { q: q || undefined, sort } });
  return data as WorkoutSessionSummary[];
};

export const getSessionById = async (id: number | string): Promise<WorkoutSession> => {
  const { data } = await api.get(`/sessions/${id}`);
  return data as WorkoutSession;
};

export const renameSession = async (id: number | string, name: string): Promise<WorkoutSession> => {
  const { data } = await api.put(`/sessions/${id}`, { name });
  return data as WorkoutSession;
};

export const addExerciseToSession = async (
  sessionId: number | string,
  input: { exerciseId: string; sets?: number; durationSeconds?: number | null; restSeconds?: number }
): Promise<WorkoutSession> => {
  const { data } = await api.post(`/sessions/${sessionId}/exercises`, input);
  return data as WorkoutSession;
};

export const removeExerciseFromSession = async (
  sessionId: number | string,
  sessionExerciseId: number
): Promise<WorkoutSession> => {
  const { data } = await api.delete(`/sessions/${sessionId}/exercises/${sessionExerciseId}`);
  return data as WorkoutSession;
};

export const updateSessionExercise = async (
  sessionId: number | string,
  sessionExerciseId: number,
  input: { sets?: number; durationSeconds?: number | null; restSeconds?: number }
): Promise<WorkoutSession> => {
  const { data } = await api.patch(`/sessions/${sessionId}/exercises/${sessionExerciseId}`, input);
  return data as WorkoutSession;
};

export const replaceSessionExercises = async (
  sessionId: number | string,
  exercises: { exerciseId: string; sets?: number; durationSeconds?: number | null; restSeconds?: number }[]
): Promise<WorkoutSession> => {
  const { data } = await api.put(`/sessions/${sessionId}/exercises`, { exercises });
  return data as WorkoutSession;
};

export const reorderSessionExercises = async (
  sessionId: number | string,
  order: number[]
): Promise<WorkoutSession> => {
  const { data } = await api.put(`/sessions/${sessionId}/reorder`, { order });
  return data as WorkoutSession;
};

/**
 * Génère une séance (aperçu, rien n'est enregistré). L'appel à l'IA peut durer
 * plus longtemps que les autres requêtes : timeout dédié.
 */
export const generateSession = async (
  input: GenerateSessionInput
): Promise<GeneratedSession> => {
  const { data } = await api.post("/sessions/generate", input, { timeout: 45000 });
  return data as GeneratedSession;
};
