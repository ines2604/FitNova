import { useState } from "react";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";

import * as authService from "../services/auth.service";
import { StoredUser } from "../utils/storage";

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
});

type UseGoogleAuthResult = {
  isReady: boolean;
  loading: boolean;
  error: string | null;
  promptGoogleLogin: () => Promise<void>;
};

export const useGoogleAuth = (
  onSuccess: (user: StoredUser) => void
): UseGoogleAuthResult => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const promptGoogleLogin = async () => {
    try {
      setError(null);
      setLoading(true);

      await GoogleSignin.hasPlayServices();

      // Déconnecte le compte Google précédemment sélectionné
      await GoogleSignin.signOut();

      // Affiche le choix des comptes Google
      const userInfo = await GoogleSignin.signIn();

      const idToken = userInfo.data?.idToken;

      if (!idToken) {
        throw new Error("Token Google introuvable");
      }

      const data = await authService.googleLogin(idToken);

      onSuccess(data.user);
    } catch (e: any) {
      console.error("Erreur Google Login:", e);

      if (e?.code === statusCodes.SIGN_IN_CANCELLED) {
        return;
      }

      if (e?.code === statusCodes.IN_PROGRESS) {
        setError("Connexion Google déjà en cours");
        return;
      }

      if (e?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setError("Google Play Services n'est pas disponible");
        return;
      }

      setError(
        e?.response?.data?.message ||
        e?.message ||
        "Échec de la connexion Google"
      );
    } finally {
      setLoading(false);
    }
  };

  return {
    isReady: true,
    loading,
    error,
    promptGoogleLogin,
  };
};