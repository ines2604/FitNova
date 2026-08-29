export type Gender = "male" | "female";

export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";

export type Goal = "weight_loss" | "muscle_gain" | "maintenance";

export type ProfileStepKey =
  | "age"
  | "gender"
  | "heightCm"
  | "weightKg"
  | "activityLevel"
  | "goal"
  | "dailyWaterGoalMl"
  | "dailyStepGoal";

export type ProfileFormValues = {
  age: string;
  gender: Gender | null;
  heightCm: string;
  weightKg: string;
  activityLevel: ActivityLevel | null;
  goal: Goal | null;
  dailyWaterGoalMl: string;
  dailyStepGoal: string;
};

export type CreateProfilePayload = {
  age: number;
  gender: Gender;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: Goal;
  dailyWaterGoalMl: number;
  dailyStepGoal: number;
};

export type UserProfile = {
  id: number;
  user_id: number;
  age: number;
  gender: Gender;
  height_cm: number;
  weight_kg: number;
  activity_level: ActivityLevel;
  goal: Goal;
  daily_calorie_goal?: number;
  daily_water_goal_ml?: number;
  daily_step_goal?: number;
  bmi?: number;
  bmiCategory?: string;
};

export type ChoiceOption = {
  value: string;
  label: string;
  description?: string;
};

export type ProfileStep = {
  key: ProfileStepKey;
  headerTitle: string;
  title: string;
  subtitle: string;
  inputType: "number" | "decimal" | "choice" | "water" | "steps";
  placeholder?: string;
  unit?: string;
  icon?: string;
  options?: ChoiceOption[];
};
