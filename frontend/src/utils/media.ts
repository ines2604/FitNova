import Constants from "expo-constants";

const FALLBACK_URL = "http://localhost:5000";

export const getApiOrigin = () => {
  const apiUrl =
    process.env.EXPO_PUBLIC_API_URL ||
    (Constants.expoConfig?.extra as { apiUrl?: string })?.apiUrl ||
    `${FALLBACK_URL}/api`;

  return apiUrl.replace(/\/api\/?$/, "");
};

export const getUploadUrl = (path?: string | null) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${getApiOrigin()}${path.startsWith("/") ? path : `/${path}`}`;
};
