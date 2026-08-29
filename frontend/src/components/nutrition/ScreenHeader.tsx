import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

type Props = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightPress?: () => void;
};

export default function ScreenHeader({
  title,
  subtitle,
  onBack,
  rightIcon,
  onRightPress,
}: Props) {
  const router = useRouter();

  return (
    <View style={styles.header}>
      <Pressable
        onPress={onBack ?? (() => router.back())}
        style={styles.backBtn}
        hitSlop={8}
      >
        <Ionicons name="arrow-back" size={22} color="#1E293B" />
      </Pressable>
      <View style={styles.titleWrap}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {rightIcon && onRightPress ? (
        <Pressable onPress={onRightPress} style={styles.backBtn} hitSlop={8}>
          <Ionicons name={rightIcon} size={22} color="#1E293B" />
        </Pressable>
      ) : (
        <View style={styles.backBtn} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  titleWrap: {
    flex: 1,
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1E293B",
  },
  subtitle: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 2,
  },
});
