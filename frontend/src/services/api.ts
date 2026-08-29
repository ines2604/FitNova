import axios from "axios";
import Constants from "expo-constants";
import { getToken } from "../utils/storage";

// L'URL du backend se configure via la variable d'environnement
// EXPO_PUBLIC_API_URL (voir .env.example à la racine du projet frontend).
//
// IMPORTANT (test sur téléphone/émulateur physique) :
// "localhost" ne fonctionne PAS depuis un téléphone ou un émulateur Android.
// Utilisez l'adresse IP locale de votre machine, ex :
// EXPO_PUBLIC_API_URL=http://192.168.1.10:5000/api
const FALLBACK_URL = "http://localhost:5000/api";

const baseURL =
  process.env.EXPO_PUBLIC_API_URL ||
  (Constants.expoConfig?.extra as any)?.apiUrl ||
  FALLBACK_URL;

// URL racine du serveur (sans le suffixe "/api"), utile pour résoudre les
// chemins relatifs renvoyés par le backend (ex: photos uploadées "/uploads/...").
export const getServerBaseUrl = () => baseURL.replace(/\/api\/?$/, "");

export const api = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attache automatiquement le token JWT (si présent) à chaque requête
api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Normalise les erreurs pour toujours avoir un champ `message` lisible
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      "Une erreur réseau est survenue";
    return Promise.reject({ ...error, message, status: error?.response?.status });
  }
);

export default api;
