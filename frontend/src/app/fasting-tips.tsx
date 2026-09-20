import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Pressable } from "react-native";
import { COLORS } from "@/constants/colors";

type Tip = {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  title: string;
  description: string;
};

type TipSection = {
  title: string;
  tips: Tip[];
};

const SECTIONS: TipSection[] = [
  {
    title: "Avant de commencer",
    tips: [
      {
        icon: "trending-up-outline",
        color: "#407BFF",
        title: "Augmente la durée progressivement",
        description:
          "Commence par un jeûne court (8-10 h) puis allonge petit à petit vers 12 h ou plus, pour laisser ton corps s'adapter.",
      },
      {
        icon: "water-outline",
        color: "#0EA5E9",
        title: "Reste bien hydraté",
        description:
          "L'eau, le thé et le café non sucrés sont autorisés pendant le jeûne et aident à limiter la faim.",
      },
      {
        icon: "medkit-outline",
        color: "#EF4444",
        title: "Demande un avis médical si besoin",
        description:
          "En cas de grossesse, diabète, trouble alimentaire ou traitement médical, parles-en à un professionnel de santé avant de jeûner.",
      },
    ],
  },
  {
    title: "Pendant le jeûne",
    tips: [
      {
        icon: "walk-outline",
        color: "#1E8F4E",
        title: "Bouge, mais sans excès",
        description:
          "Une marche ou une activité légère peut aider à faire passer la faim. Évite les entraînements très intenses en fin de jeûne.",
      },
      {
        icon: "bed-outline",
        color: "#8B5CF6",
        title: "Occupe-toi l'esprit",
        description:
          "Les premières fringales passent souvent en 15-20 minutes. Une activité, un appel ou une tâche à faire aide à ne pas y penser.",
      },
      {
        icon: "alert-circle-outline",
        color: "#F08A24",
        title: "Écoute ton corps",
        description:
          "Vertiges, fatigue intense ou malaise ne sont pas normaux : arrête ton jeûne et mange si besoin, ce n'est pas un échec.",
      },
    ],
  },
  {
    title: "Pour bien rompre le jeûne",
    tips: [
      {
        icon: "nutrition-outline",
        color: "#14B8A6",
        title: "Reprends en douceur",
        description:
          "Privilégie un repas riche en protéines et fibres plutôt qu'un repas très copieux ou sucré, pour éviter les inconforts digestifs.",
      },
      {
        icon: "restaurant-outline",
        color: "#F08A24",
        title: "Mange lentement",
        description:
          "Prends le temps de mastiquer : la sensation de satiété met plusieurs minutes à s'installer après une longue période à jeun.",
      },
    ],
  },
  {
    title: "Erreurs fréquentes à éviter",
    tips: [
      {
        icon: "close-circle-outline",
        color: "#EF4444",
        title: "Compenser avec un excès de calories",
        description:
          "Le jeûne n'est pas une excuse pour un repas excessif juste après : l'objectif est un équilibre sur la journée, pas une privation-punition.",
      },
      {
        icon: "close-circle-outline",
        color: "#EF4444",
        title: "Jeûner sans dormir suffisamment",
        description:
          "Le manque de sommeil augmente la faim et rend le jeûne beaucoup plus difficile à tenir dans la durée.",
      },
    ],
  },
];

export default function FastingTipsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <LinearGradient
        colors={["#407BFF", "#6E9BFF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <View style={styles.heroIcon}>
          <Ionicons name="bulb" size={28} color="#fff" />
        </View>
        <Text style={styles.heroTitle}>Conseils sur le jeûne</Text>
        <Text style={styles.heroSubtitle}>
          Des repères simples pour jeûner sereinement et sans erreurs.
        </Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.tips.map((tip) => (
              <View key={tip.title} style={styles.tipCard}>
                <View style={[styles.tipIcon, { backgroundColor: `${tip.color}1A` }]}>
                  <Ionicons name={tip.icon} size={20} color={tip.color} />
                </View>
                <View style={styles.tipTextWrap}>
                  <Text style={styles.tipTitle}>{tip.title}</Text>
                  <Text style={styles.tipDescription}>{tip.description}</Text>
                </View>
              </View>
            ))}
          </View>
        ))}

        <View style={styles.disclaimer}>
          <Ionicons name="information-circle-outline" size={16} color={COLORS.textFaint} />
          <Text style={styles.disclaimerText}>
            Ces conseils sont informatifs et ne remplacent pas un avis médical personnalisé.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    paddingTop: 4,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  backBtn: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
  },
  heroSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.9)",
    marginTop: 4,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 22,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.textDark,
    marginBottom: 10,
  },
  tipCard: {
    flexDirection: "row",
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tipIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  tipTextWrap: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.textDark,
    marginBottom: 4,
  },
  tipDescription: {
    fontSize: 12.5,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  disclaimer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 6,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    color: COLORS.textFaint,
  },
});
