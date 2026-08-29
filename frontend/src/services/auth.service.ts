import api from "./api";
import { saveSession, clearSession, StoredUser } from "../utils/storage";

export type OtpType = "email_verification" | "password_reset";

// ---- Inscription (email + mot de passe) ----------------------------------
export const register = async (fullName: string, email: string, password: string) => {
  const { data } = await api.post("/auth/register", { fullName, email, password });
  return data as { message: string; userId: number };
};

// ---- Vérification de l'email via code OTP ---------------------------------
export const verifyEmail = async (userId: number, code: string) => {
  const { data } = await api.post("/auth/verify-email", { userId, code });
  if (data.token && data.user) {
    await saveSession(data.token, data.user as StoredUser);
  }
  return data as { message: string; token: string; user: StoredUser };
};

// ---- Renvoyer un code OTP (inscription ou reset mot de passe) -------------
export const resendOtp = async (userId: number, type: OtpType) => {
  const { data } = await api.post("/auth/resend-otp", { userId, type });
  return data as { message: string };
};

// ---- Connexion email + mot de passe ---------------------------------------
export const login = async (email: string, password: string) => {
  const { data } = await api.post("/auth/login", { email, password });
  if (data.token && data.user) {
    await saveSession(data.token, data.user as StoredUser);
  }
  return data as {
    token?: string;
    user?: StoredUser;
    message?: string;
    userId?: number;
    emailVerified?: boolean;
  };
};

// ---- Connexion avec Google (idToken vérifié côté serveur) -----------------
export const googleLogin = async (idToken: string) => {
  const { data } = await api.post("/auth/google", { idToken });
  if (data.token && data.user) {
    await saveSession(data.token, data.user as StoredUser);
  }
  return data as { token: string; user: StoredUser };
};

// ---- Mot de passe oublié : envoi du code -----------------------------------
export const forgotPassword = async (email: string) => {
  const { data } = await api.post("/auth/forgot-password", { email });
  return data as { message: string; userId?: number };
};

// ---- Vérifier le code OTP de réinitialisation (sans le consommer) ---------
export const verifyResetOtp = async (userId: number, code: string) => {
  const { data } = await api.post("/auth/verify-reset-otp", { userId, code });
  return data as { message: string };
};

// ---- Réinitialisation du mot de passe (après code OTP validé) -------------
export const resetPassword = async (userId: number, code: string, newPassword: string) => {
  const { data } = await api.post("/auth/reset-password", { userId, code, newPassword });
  return data as { message: string };
};

// ---- Déconnexion locale ----------------------------------------------------
export const logout = async () => {
  await clearSession();
};
