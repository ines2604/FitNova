import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { COLORS } from "@/constants/colors";

type Props = {
  name: string;
  avatar?: string | null;
};

const getGreeting = (hour: number) => {
  // Salutation matinale de 5h à 17h59, salutation du soir le reste du temps.
  if (hour >= 5 && hour < 18) return "Bonjour";
  return "Bonsoir";
};

export default function HomeHeader({ name, avatar }: Props) {
  const initial = (name || "U").charAt(0).toUpperCase();

  const today = new Date();
  const greeting = getGreeting(today.getHours());

  const date = today.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <Text style={styles.date}>{date}</Text>
        <Text style={styles.greeting} numberOfLines={1}>
          {greeting}, <Text style={styles.name}>{name}</Text>
        </Text>
      </View>

      {avatar ? (
        <Image source={{ uri: avatar }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.initial}>{initial}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },

  left: {
    flex: 1,
    paddingRight: 12,
  },

  date: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textFaint,
    textTransform: "capitalize",
    marginBottom: 4,
  },

  greeting: {
    fontSize: 21,
    color: COLORS.textDark,
    fontWeight: "700",
  },

  name: {
    color: COLORS.primary,
    fontWeight: "800",
  },

  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },

  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },

  initial: {
    color: "#fff",
    fontSize: 19,
    fontWeight: "bold",
  },
});
