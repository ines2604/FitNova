import { useState } from "react";
import { INITIAL_PROFILE_VALUES, PROFILE_STEPS } from "../constants/profileSteps";
import { createProfile } from "../services/profile.service";
import {
  ActivityLevel,
  CreateProfilePayload,
  Gender,
  Goal,
  ProfileFormValues,
  ProfileStepKey,
} from "../types/profile";
import {
  parseProfileNumber,
  validateAllSteps,
  validateStep,
} from "../utils/profileValidation";

export const useCompleteProfile = () => {
  const [stepIndex, setStepIndex] = useState(0);
  const [values, setValues] = useState<ProfileFormValues>(INITIAL_PROFILE_VALUES);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const step = PROFILE_STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === PROFILE_STEPS.length - 1;
  const progress = (stepIndex + 1) / PROFILE_STEPS.length;

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
      await createProfile(payload);
      return true;
    } catch (e: any) {
      if (e?.status === 409) return true;
      setError(e?.message || "Impossible d'enregistrer le profil");
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  return {
    step,
    stepIndex,
    totalSteps: PROFILE_STEPS.length,
    values,
    error,
    submitting,
    isFirst,
    isLast,
    progress,
    setField,
    goNext,
    goPrev,
    submit,
  };
};
