import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Easing } from "react-native";

// Bulle "le bot est en train d'écrire", avec 3 points qui pulsent
// en boucle. Rendue comme un message bot dans la FlatList tant que
// `sending` est true (voir chatbot.tsx).
export default function TypingIndicator() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateDot = (value: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, {
            toValue: 1,
            duration: 350,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: 350,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );

    const anim1 = animateDot(dot1, 0);
    const anim2 = animateDot(dot2, 150);
    const anim3 = animateDot(dot3, 300);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, [dot1, dot2, dot3]);

  const dotStyle = (value: Animated.Value) => ({
    opacity: value.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    }),
    transform: [
      {
        translateY: value.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -4],
        }),
      },
    ],
  });

  return (
    <View style={styles.row}>
      <View style={styles.bubble}>
        <Animated.View style={[styles.dot, dotStyle(dot1)]} />
        <Animated.View style={[styles.dot, dotStyle(dot2)]} />
        <Animated.View style={[styles.dot, dotStyle(dot3)]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  bubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F1F5F9",
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#94A3B8",
  },
});