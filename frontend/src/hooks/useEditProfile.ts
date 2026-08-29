import { useCallback, useEffect, useState } from "react";
import { INITIAL_PROFILE_VALUES, PROFILE_STEPS } from "../constants/profileSteps";
import { getProfile, updateProfile } from "../services/profile.service";
import {
  ActivityLevel,
  CreateProfilePayload,
  Gender,
  Goal,
  ProfileFormValues,
  ProfileStepKey,
  UserProfile,
} from "../types/profile";
import {
  parseProfileNumber,
  validateAllSteps,
  validateStep,
} from "../utils/profileValidation";

const profileToFormValues = (profile: UserProfile): ProfileFormValues => ({
  age: profile.age != null ? String(profile.age) : INITIAL_PROFILE_VALUES.age,
  gender: profile.gender ?? null,
  heightCm:
    profile.height_cm != null
      ? String(profile.height_cm)
      : INITIAL_PROFILE_VALUES.heightCm,
  weightKg:
    profile.weight_kg != null
      ? String(profile.weight_kg)
      : INITIAL_PROFILE_VALUES.weightKg,
  activityLevel: profile.activity_level ?? null,
  goal: profile.goal ?? null,
  dailyWaterGoalMl:
    profile.daily_water_goal_ml != null
      ? String(profile.daily_water_goal_ml)
      : INITIAL_PROFILE_VALUES.dailyWaterGoalMl,
  dailyStepGoal:
    profile.daily_step_goal != null
      ? String(profile.daily_step_goal)
      : INITIAL_PROFILE_VALUES.dailyStepGoal,
});

export const useEditProfile = () => {
  const [loading, setLoading] = useState(true);
  const [stepIndex, setStepIndex] = useState(0);
  const [values, setValues] = useState<ProfileFormValues>(INITIAL_PROFILE_VALUES);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const step = PROFILE_STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === PROFILE_STEPS.length - 1;

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const profile = await getProfile();
      setValues(profileToFormValues(profile));
    } catch (e: any) {
      setError(e?.message || "Impossible de charger le profil");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const setField = (key: ProfileStepKey, value: string) => {
    setError("");
    setValues((prev) => {
      if (key === "gender") return { ...prev, gender: value as Gender };
      if (key === "activityLevel") {
        return { ...prev, activityLevel: value as ActivityLevel };
      }
      if (key === "goal") return { ...prev, goal: value as Goal };
      return { ...prev, [key]: value };
    });
  };

  const goNext = () => {
    const message = validateStep(step.key, values);
    if (message) {
      setError(message);
      return false;
    }
    if (!isLast) {
      setError("");
      setStepIndex((current) => current + 1);
    }
    return true;
  };

  const goPrev = () => {
    if (!isFirst) {
      setError("");
      setStepIndex((current) => current - 1);
    }
  };

  const submit = async () => {
    const message = validateAllSteps(values);
    if (message) {
      setError(message);
      return false;
    }

    const payload: CreateProfilePayload = {
      age: parseProfileNumber(values.age),
      gender: values.gender as Gender,
      heightCm: parseProfileNumber(values.heightCm),
      weightKg: parseProfileNumber(values.weightKg),
      activityLevel: values.activityLevel as ActivityLevel,
      goal: values.goal as Goal,
      dailyWaterGoalMl: parseProfileNumber(values.dailyWaterGoalMl),
      dailyStepGoal: parseProfileNumber(values.dailyStepGoal),
    };

    setSubmitting(true);
    setError("");
    try {
      await updateProfile(payload);
      return true;
    } catch (e: any) {
      setError(e?.message || "Impossible de mettre à jour le profil");
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  return {
    loading,
    step,
    stepIndex,
    totalSteps: PROFILE_STEPS.length,
    values,
    error,
    submitting,
    isFirst,
    isLast,
    setField,
    goNext,
    goPrev,
    submit,
  };
};
