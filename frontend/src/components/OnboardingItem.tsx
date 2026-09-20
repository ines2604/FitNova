import {
  View,
  Text,
  Image,
  useWindowDimensions,
  StyleSheet,
} from "react-native";
import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { OnBoardingscreenProps } from "@/utils/Pagination";

const OnboardingItem = ({ item }: OnBoardingscreenProps) => {
  const { width } = useWindowDimensions();

  return (
    <View style={[styles.container, { width }]}>
      {item.image ? (
        <Image
          source={item.image}
          style={[
            styles.image,
            {
              width: width * 0.75,
              height: width * 0.75,
            },
          ]}
          resizeMode="contain"
        />
      ) : (
        // Illustration par icône pour les écrans sans image (jeûne, séances).
        // Pour la remplacer par un dessin, il suffit d'ajouter `image` à la
        // slide correspondante dans utils/slides.ts.
        <View
          style={[
            styles.image,
            styles.iconWrap,
            {
              width: width * 0.75,
              height: width * 0.75,
            },
          ]}
        >
          <View
            style={[
              styles.iconCircleOuter,
              { backgroundColor: `${item.color ?? "#407BFF"}1A` },
            ]}
          >
            <View
              style={[
                styles.iconCircleInner,
                { backgroundColor: `${item.color ?? "#407BFF"}33` },
              ]}
            >
              <Ionicons
                name={(item.icon ?? "fitness-outline") as any}
                size={width * 0.24}
                color={item.color ?? "#407BFF"}
              />
            </View>
          </View>
        </View>
      )}

      <View style={styles.textContainer}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
    </View>
  );
};

export default OnboardingItem;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  image: {
    marginBottom: 30,
  },

  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
  },

  iconCircleOuter: {
    width: "88%",
    aspectRatio: 1,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },

  iconCircleInner: {
    width: "68%",
    aspectRatio: 1,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },

  textContainer: {
    paddingHorizontal: 20,
    alignItems: "center",
  },

  title: {
    fontSize: 26,
    fontWeight: "600",
    marginBottom: 10,
    textAlign: "center",
    color: "#111111",
  },

  description: {
    fontWeight: "400",
    fontSize: 16,
    lineHeight: 22,
    color: "#575757",
    textAlign: "center",
  },
});