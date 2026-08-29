import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

type NutritionCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  color: string;
  onPress: () => void;
};

const NutritionCard = ({ icon, title, subtitle, color, onPress }: NutritionCardProps) => (
  <Pressable style={styles.card} onPress={onPress}>
    <View style={[styles.cardIcon, { backgroundColor: color }]}>
      <Ionicons name={icon} size={26} color="#fff" />
    </View>
    <View style={styles.cardText}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardSubtitle}>{subtitle}</Text>
    </View>
    <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
  </Pressable>
);

const Nutrition = () => {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Nutrition</Text>
          <Text style={styles.subtitle}>
            Recherche des aliments, découvre des repas et scanne tes produits.
          </Text>
        </View>

        <NutritionCard
          icon="nutrition"
          title="Aliments"
          subtitle="Cherche un aliment et consulte ses calories"
          color="#407BFF"
          onPress={() => router.push("/nutrition-foods")}
        />

        <NutritionCard
          icon="restaurant"
          title="Repas"
          subtitle="Découvre des idées de repas et leurs détails"
          color="#FF8A3D"
          onPress={() => router.push("/nutrition-meals")}
        />

        <NutritionCard
          icon="barcode"
          title="Scanner un produit"
          subtitle="Scanne un code-barres pour voir ses infos"
          color="#1E8F4E"
          onPress={() => router.push("/nutrition-scanner")}
        />

        <NutritionCard
          icon="camera"
          title="Scanner un repas"
          subtitle="Prends une photo pour estimer calories & macros"
          color="#9B5DE5"
          onPress={() => router.push("/nutrition-meal-scanner")}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default Nutrition;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F4F7FF",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1E293B",
  },
  subtitle: {
    fontSize: 14,
    color: "#94A3B8",
    marginTop: 6,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  cardIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E293B",
  },
  cardSubtitle: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 3,
  },
});