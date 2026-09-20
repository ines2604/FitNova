import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  addFavorite,
  getFavoriteStatus,
  removeFavorite,
} from "@/services/favorites.service";
import { AddFavoriteInput } from "@/types/favorite";

type Props = {
  item: AddFavoriteInput;
  size?: number;
  style?: ViewStyle;
  /** Couleur de l'icône quand l'élément n'est PAS en favoris. */
  inactiveColor?: string;
  /** Appelé après un ajout (true) ou un retrait (false) réussi. */
  onChange?: (isFavorite: boolean) => void;
};

// Bouton cœur générique pour ajouter/retirer un aliment (Open Food Facts,
// scan code-barres, scan photo) ou un repas (TheMealDB) des favoris.
// - Si `item.refId` est fourni, l'état favori est vérifié au montage et le
//   retrait se fait via cet identifiant (pas de doublons possibles).
// - Sans `refId` (ex. plat détecté par photo sans code-barres), chaque appui
//   ajoute une nouvelle entrée ; le retrait reste possible juste après via
//   l'identifiant renvoyé par le serveur, le temps de la session en cours.
export default function FavoriteButton({
  item,
  size = 22,
  style,
  inactiveColor = "#94A3B8",
  onChange,
}: Props) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteId, setFavoriteId] = useState<number | null>(null);
  const [checking, setChecking] = useState(!!item.refId);
  const [busy, setBusy] = useState(false);

  const checkStatus = useCallback(async () => {
    if (!item.refId) {
      setChecking(false);
      return;
    }
    setChecking(true);
    try {
      const status = await getFavoriteStatus(item.itemType, item.refId);
      setIsFavorite(status.isFavorite);
      setFavoriteId(status.favoriteId);
    } catch {
      // Non bloquant : le bouton reste utilisable même si la vérification échoue.
    } finally {
      setChecking(false);
    }
  }, [item.itemType, item.refId]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const toggle = async () => {
    if (busy || checking) return;
    setBusy(true);
    try {
      if (isFavorite && favoriteId) {
        await removeFavorite(favoriteId);
        setIsFavorite(false);
        setFavoriteId(null);
        onChange?.(false);
      } else {
        const created = await addFavorite(item);
        setIsFavorite(true);
        setFavoriteId(created.id);
        onChange?.(true);
      }
    } catch {
      // Non bloquant : on laisse l'utilisateur réessayer.
    } finally {
      setBusy(false);
    }
  };

  if (checking) {
    return <ActivityIndicator size="small" color={inactiveColor} style={style} />;
  }

  return (
    <Pressable onPress={toggle} disabled={busy} hitSlop={8} style={[styles.btn, style]}>
      {busy ? (
        <ActivityIndicator size="small" color={inactiveColor} />
      ) : (
        <Ionicons
          name={isFavorite ? "heart" : "heart-outline"}
          size={size}
          color={isFavorite ? "#EF4444" : inactiveColor}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignItems: "center",
    justifyContent: "center",
  },
});