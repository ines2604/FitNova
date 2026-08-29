import {
  View,
  Text,
  Image,
  useWindowDimensions,
  StyleSheet,
} from "react-native";
import React from "react";
import { OnBoardingscreenProps } from "@/utils/Pagination";

const OnboardingItem = ({ item }: OnBoardingscreenProps) => {
  const { width } = useWindowDimensions();

  return (
    <View style={[styles.container, { width }]}>
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