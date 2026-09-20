import api from "./api";
import { AddFavoriteInput, FavoriteEntry, FavoriteItemType } from "@/types/favorite";

/** Récupère les favoris de l'utilisateur (aliments et/ou repas). */
export const getFavorites = async (type?: FavoriteItemType): Promise<FavoriteEntry[]> => {
  const { data } = await api.get("/favorites", {
    params: type ? { type } : undefined,
  });
  return data as FavoriteEntry[];
};

/** Vérifie si un élément précis (aliment ou repas) est déjà en favoris. */
export const getFavoriteStatus = async (
  itemType: FavoriteItemType,
  refId: string | null | undefined
): Promise<{ isFavorite: boolean; favoriteId: number | null }> => {
  if (!refId) return { isFavorite: false, favoriteId: null };
  const { data } = await api.get("/favorites/status", {
    params: { itemType, refId },
  });
  return data as { isFavorite: boolean; favoriteId: number | null };
};

/** Ajoute un élément aux favoris (idempotent côté serveur). */
export const addFavorite = async (input: AddFavoriteInput): Promise<FavoriteEntry> => {
  const { data } = await api.post("/favorites", input);
  return data as FavoriteEntry;
};

/** Retire un élément des favoris. */
export const removeFavorite = async (id: number): Promise<void> => {
  await api.delete(`/favorites/${id}`);
};
