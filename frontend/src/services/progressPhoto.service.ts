import api from "./api";
import { ProgressPhotoEntry } from "@/types/progressPhoto";

/** Récupère l'historique des photos de progression de l'utilisateur. */
export const getProgressPhotos = async (): Promise<ProgressPhotoEntry[]> => {
  const { data } = await api.get("/progress-photos");
  return data as ProgressPhotoEntry[];
};

/**
 * Envoie une nouvelle photo de progression (prise avec l'appareil photo ou
 * importée depuis la galerie), avec la date associée et éventuellement le
 * poids enregistré à ce moment-là.
 */
export const addProgressPhoto = async (
  uri: string,
  weightKg?: number | null,
  photoDate?: string
): Promise<ProgressPhotoEntry> => {
  const formData = new FormData();
  const extension = uri.split(".").pop()?.toLowerCase() || "jpg";
  const mimeType =
    extension === "png" ? "image/png" : extension === "webp" ? "image/webp" : "image/jpeg";

  formData.append("photo", {
    uri,
    type: mimeType,
    name: `progress.${extension}`,
  } as unknown as Blob);

  if (weightKg !== undefined && weightKg !== null) {
    formData.append("weightKg", String(weightKg));
  }
  if (photoDate) {
    formData.append("photoDate", photoDate);
  }

  const { data } = await api.post("/progress-photos", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return data as ProgressPhotoEntry;
};

/** Supprime une photo de progression. */
export const deleteProgressPhoto = async (id: number): Promise<void> => {
  await api.delete(`/progress-photos/${id}`);
};