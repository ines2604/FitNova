export type DailyStat = {
  id?: number;
  user_id?: number;
  date: string;
  water_intake_ml: number;
  steps: number;
  calories_burned: number;
  calories_consumed?: number;
  bedtime?: string | null;
  wake_time?: string | null;
  sleep_duration_minutes?: number | null;
};

export type WeightRecord = {
  id: number;
  user_id: number;
  weight_kg: number;
  bmi: number;
  category: string;
  record_date: string;
};

export type DashboardData = {
  goals: {
    dailyCalorieGoal?: number;
    dailyWaterGoalMl?: number;
    dailyStepGoal?: number;
  };
  dailyStats: DailyStat[];
  weightProgress: WeightRecord[];
};
