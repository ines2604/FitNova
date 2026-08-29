export type ReminderType = "water" | "activity" | "sleep";

// 'once'          -> rappel unique, à l'heure exacte choisie
// 'every_30_min'  -> rappel répété toutes les 30 minutes
// 'every_hour'    -> rappel répété toutes les heures
// 'every_2_hours' -> rappel répété toutes les 2 heures
export type ReminderFrequency =
  | "once"
  | "every_30_min"
  | "every_hour"
  | "every_2_hours";

export type Reminder = {
  id: number;
  user_id: number;
  type: ReminderType;
  time: string;
  frequency: ReminderFrequency;
  end_time: string | null;
  active_days: string;
  is_active: boolean | number;
};

export type CreateReminderPayload = {
  type: ReminderType;
  time: string;
  activeDays: string;
  frequency?: ReminderFrequency;
  endTime?: string;
};

export type UpdateReminderPayload = {
  time?: string;
  activeDays?: string;
  isActive?: boolean;
  frequency?: ReminderFrequency;
  // `null` efface explicitement la date de fin (ex: fréquence "once").
  // `undefined` = champ non concerné par cette mise à jour.
  endTime?: string | null;
};

export const DEFAULT_REMINDER_TIME = "09:00";
export const DEFAULT_REMINDER_END_TIME = "21:00";
export const DEFAULT_REMINDER_FREQUENCY: ReminderFrequency = "once";
export const ALL_ACTIVE_DAYS = "0,1,2,3,4,5,6";

export const FREQUENCY_OPTIONS: {
  value: ReminderFrequency;
  label: string;
  shortLabel: string;
  intervalMinutes: number | null;
}[] = [
  { value: "once", label: "Heure précise", shortLabel: "Précis", intervalMinutes: null },
  { value: "every_30_min", label: "Toutes les 30 min", shortLabel: "30 min", intervalMinutes: 30 },
  { value: "every_hour", label: "Toutes les heures", shortLabel: "1 h", intervalMinutes: 60 },
  { value: "every_2_hours", label: "Toutes les 2 heures", shortLabel: "2 h", intervalMinutes: 120 },
];

export const getFrequencyOption = (frequency?: ReminderFrequency | null) =>
  FREQUENCY_OPTIONS.find((option) => option.value === frequency) ??
  FREQUENCY_OPTIONS[0];

export const getFrequencyIntervalMinutes = (
  frequency?: ReminderFrequency | null
) => getFrequencyOption(frequency).intervalMinutes;

export const isIntervalFrequency = (frequency?: ReminderFrequency | null) =>
  getFrequencyIntervalMinutes(frequency) !== null;

export const DAY_OPTIONS = [
  { index: 0, label: "Lun" },
  { index: 1, label: "Mar" },
  { index: 2, label: "Mer" },
  { index: 3, label: "Jeu" },
  { index: 4, label: "Ven" },
  { index: 5, label: "Sam" },
  { index: 6, label: "Dim" },
] as const;

export const REMINDER_LABELS: Record<
  ReminderType,
  { title: string; emoji: string }
> = {
  water: { title: "Rappel hydratation", emoji: "💧" },
  activity: { title: "Rappel activité", emoji: "🏃" },
  sleep: { title: "Rappel sommeil", emoji: "😴" },
};

export const parseActiveDays = (activeDays?: string | null): number[] => {
  if (!activeDays) return [];
  return activeDays
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6);
};

export const formatActiveDays = (days: number[]): string =>
  [...new Set(days)]
    .filter((day) => day >= 0 && day <= 6)
    .sort((a, b) => a - b)
    .join(",");

export const formatReminderTime = (time?: string | null) =>
  (time || DEFAULT_REMINDER_TIME).slice(0, 5);

export const timeStringToDate = (time: string) => {
  const [hours, minutes] = time.slice(0, 5).split(":").map(Number);
  const date = new Date();
  date.setHours(hours || 9, minutes || 0, 0, 0);
  return date;
};

export const dateToTimeString = (date: Date) => {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};