import api from "./api";
import { CreateProfilePayload, UserProfile } from "../types/profile";

export const getProfile = async (): Promise<UserProfile> => {
  const { data } = await api.get("/profile");
  return data as UserProfile;
};

export const createProfile = async (
  payload: CreateProfilePayload
): Promise<UserProfile> => {
  const { data } = await api.post("/profile", payload);
  return data as UserProfile;
};

export const updateProfile = async (
  payload: Partial<CreateProfilePayload> & { dailyCalorieGoal?: number }
): Promise<UserProfile> => {
  const { data } = await api.put("/profile", payload);
  return data as UserProfile;
};

export const isProfileComplete = async (): Promise<boolean> => {
  try {
    await getProfile();
    return true;
  } catch (e: any) {
    if (e?.status === 404) return false;
    throw e;
  }
};
