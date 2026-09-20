import React, { useState } from "react";
import { View, Image, StyleSheet, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  gifUrl: string | null;
  imageUrl: string | null;
  style?: ViewStyle;
  height?: number;
};

export default function ExerciseMedia({ gifUrl, imageUrl, style, height = 260 }: Props) {
  const [gifFailed, setGifFailed] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  const wrapStyle = [styles.mediaWrap, { height }, style];

  if (gifUrl && !gifFailed) {
    return (
      <View style={wrapStyle}>
        <Image
          source={{ uri: gifUrl }}
          style={styles.media}
          resizeMode="contain"
          onError={() => setGifFailed(true)}
        />
      </View>
    );
  }

  if (imageUrl && !imageFailed) {
    return (
      <View style={wrapStyle}>
        <Image
          source={{ uri: imageUrl }}
          style={styles.media}
          resizeMode="contain"
          onError={() => setImageFailed(true)}
        />
      </View>
    );
  }

  return (
    <View style={[wrapStyle, styles.mediaPlaceholder]}>
      <Ionicons name="barbell-outline" size={40} color="#94A3B8" />
    </View>
  );
}

const styles = StyleSheet.create({
  mediaWrap: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
  },
  media: { width: "100%", height: "100%" },
  mediaPlaceholder: { alignItems: "center", justifyContent: "center", backgroundColor: "#F1F5F9" },
});
