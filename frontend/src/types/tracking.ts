export type DailyTracking = {
  id: number;
  user_id: number;
  date: string;
  calories_consumed: number;
  calories_burned: number;
  steps: number;
  water_intake_ml: number;
  sleep_duration_minutes: number | null;
  bedtime: string | null;
  wake_time: string | null;
};
