import api from "./api";
import {
  CreateReminderPayload,
  Reminder,
  UpdateReminderPayload,
} from "../types/reminder";

export const getReminders = async (): Promise<Reminder[]> => {
  const { data } = await api.get("/reminders");
  return data as Reminder[];
};

export const createReminder = async (
  payload: CreateReminderPayload
): Promise<Reminder> => {
  const { data } = await api.post("/reminders", payload);
  return data as Reminder;
};

export const updateReminder = async (
  id: number,
  payload: UpdateReminderPayload
): Promise<void> => {
  await api.put(`/reminders/${id}`, {
    time: payload.time,
    activeDays: payload.activeDays,
    isActive: payload.isActive,
    frequency: payload.frequency,
    endTime: payload.endTime,
  });
};

