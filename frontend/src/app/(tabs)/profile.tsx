import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { logout } from "@/services/auth.service";
import { getProfile } from "@/services/profile.service";
import { getMe, updateProfilePhoto } from "@/services/user.service";
import { getDashboard } from "@/services/dashboard.service";
import { UserProfile } from "@/types/profile";
import { AppUser } from "@/types/user";
import { DashboardData } from "@/types/dashboard";
import { getUploadUrl } from "@/utils/media";
import { updateStoredUser } from "@/utils/storage";
import ProfileInfoCard from "@/components/profile/ProfileInfoCard";
import WeightProgressChart from "@/components/profile/WeightProgressChart";
import DailyStatsCalendar from "@/components/profile/DailyStatsCalendar";

export default function ProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [userData, profileData, dashboardData] = await Promise.all([
        getMe(),
        getProfile(),
        getDashboard(31),
      ]);
      setUser(userData);
      setProfile(profileData);
      setDashboard(dashboardData);
      setError("");
    } catch (e: any) {
      setError(e?.message || "Impossible de charger le profil");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData().finally(() => setLoading(false));
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert("Déconnexion", "Voulez-vous vraiment vous déconnecter ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Déconnexion",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/welcome");
        },
      },
    ]);
  };

  const handleChangePhoto = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permission refusée",
          "Autorise l'accès à la galerie pour modifier ta photo de profil."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0]?.uri) return;

      setUploadingPhoto(true);
      const { profilePhoto } = await updateProfilePhoto(result.assets[0].uri);
      await updateStoredUser({ profilePhoto });
      setUser((current) =>
        current ? { ...current, profile_photo: profilePhoto } : current
      );
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Impossible de mettre à jour la photo");
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#407BFF" />
      </SafeAreaView>
    );
  }

  const avatarUrl = getUploadUrl(user?.profile_photo);
  const initial = (user?.full_name || "U").charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mon profil</Text>
        <Pressable
          style={styles.settingsBtn}
          onPress={() => router.push("/settings")}
        >
          <Ionicons name="settings-outline" size={22} color="#407BFF" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.userCard}>
          <Pressable
            style={styles.avatarWrap}
            onPress={handleChangePhoto}
            disabled={uploadingPhoto}
          >
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>{initial}</Text>
              </View>
            )}
            <View style={styles.cameraBadge}>
              {uploadingPhoto ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="camera" size={14} color="#fff" />
              )}
            </View>
          </Pressable>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.full_name}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>
        </View>

        {profile?.daily_calorie_goal ? (
          <View style={styles.calorieCard}>
            <Ionicons name="flame" size={28} color="#F97316" />
            <View style={styles.calorieText}>
              <Text style={styles.calorieLabel}>Objectif calories quotidien</Text>
              <Text style={styles.calorieValue}>
                {profile.daily_calorie_goal} kcal / jour
              </Text>
            </View>
          </View>
        ) : null}

        {profile ? <ProfileInfoCard profile={profile} /> : null}

        {dashboard ? (
          <>
            <WeightProgressChart data={dashboard.weightProgress} />
            <DailyStatsCalendar dailyStats={dashboard.dailyStats} />
          </>
        ) : null}

        <Pressable
          style={styles.primaryBtn}
          onPress={() => router.push("/edit-profile")}
        >
          <Ionicons name="create-outline" size={20} color="#fff" />
          <Text style={styles.primaryBtnText}>Modifier les informations</Text>
        </Pressable>

        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutBtnText}>Déconnexion</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F4F7FF",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F4F7FF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1E293B",
  },
  settingsBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  error: {
    color: "#EF4444",
    textAlign: "center",
    marginBottom: 12,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  avatarWrap: {
    position: "relative",
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: "#407BFF",
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#407BFF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
  },
  cameraBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#407BFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  userInfo: {
    marginLeft: 14,
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1E293B",
  },
  userEmail: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 4,
  },
  calorieCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF7ED",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FFEDD5",
  },
  calorieText: {
    marginLeft: 12,
  },
  calorieLabel: {
    fontSize: 13,
    color: "#9A3412",
  },
  calorieValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#C2410C",
    marginTop: 2,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#407BFF",
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 12,
    gap: 8,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  logoutBtnText: {
    color: "#EF4444",
    fontSize: 15,
    fontWeight: "700",
  },
});
