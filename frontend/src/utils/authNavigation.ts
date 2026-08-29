import { Href } from "expo-router";
import { clearSession, getToken } from "./storage";
import { isProfileComplete } from "../services/profile.service";

export type AuthDestination = "/Onboarding" | "/complete-profile" | "/(tabs)/Home";

export const getAuthDestination = async (): Promise<AuthDestination> => {
  const token = await getToken();
  if (!token) return "/Onboarding";

  try {
    const complete = await isProfileComplete();
    return complete ? "/(tabs)/Home" : "/complete-profile";
  } catch (e: any) {
    if (e?.status === 401) {
      await clearSession();
      return "/Onboarding";
    }
    throw e;
  }
};

export const navigateAfterAuth = async (router: { replace: (href: Href) => void }) => {
  const destination = await getAuthDestination();
  router.replace(destination as Href);
};
