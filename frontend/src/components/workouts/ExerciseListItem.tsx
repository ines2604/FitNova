import React from "react";
import { View, Text, StyleSheet, Pressable, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Exercise } from "@/types/exercise";
import FavoriteButton from "@/components/nutrition/FavoriteButton";
import {
  bodyPartLabel,
  equipmentLabel,
  muscleLabel,
  formatExerciseName,
} from "@/utils/exerciseLabels";

type Props = {
  exercise: Exercise;
  onPress: () => void;
  showFavorite?: boolean;
  /** Appelé quand l'utilisateur ajoute/retire cet exercice de ses favoris. */
  onFavoriteChange?: (exercise: Exercise, isFavorite: boolean) => void;
};

export default function ExerciseListItem({
  exercise,
  onPress,
  showFavorite,
  onFavoriteChange,
}: Props) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      {exercise.image ? (
        <Image source={{ uri: exercise.image }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Ionicons name="barbell-outline" size={22} color="#94A3B8" />
        </View>
      )}

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {formatExerciseName(exercise.name)}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {bodyPartLabel(exercise.body_part)}
          {exercise.equipment ? `  •  ${equipmentLabel(exercise.equipment)}` : ""}
        </Text>
        <Text style={styles.muscle} numberOfLines={1}>
          {muscleLabel(exercise.target)}
        </Text>
      </View>

      {showFavorite ? (
        <FavoriteButton
          style={styles.favoriteBtn}
          size={20}
          onChange={(isFavorite) => onFavoriteChange?.(exercise, isFavorite)}
          item={{
            itemType: "exercise",
            refId: String(exercise.id),
            name: exercise.name,
            imageUrl: exercise.image,
            source: "exercice",
          }}
        />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  image: {
    width: 52,
    height: 52,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: "#F1F5F9",
  },
  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
    marginRight: 8,
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
  },
  meta: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 2,
  },
  muscle: {
    fontSize: 13,
    color: "#22C55E",
    fontWeight: "600",
    marginTop: 4,
  },
  favoriteBtn: {
    marginLeft: 8,
  },
});