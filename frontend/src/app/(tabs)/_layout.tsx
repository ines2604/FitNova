import { useEffect } from "react";
import { Href, Tabs, useRouter } from "expo-router";
import BottomTabBar from "../../components/BottomTabBar";
import { getAuthDestination } from "../../utils/authNavigation";
import { getReminders } from "@/services/reminder.service";
import { syncReminderNotifications } from "@/services/notifications.service";

export default function TabLayout() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    const guard = async () => {
      try {
        const destination = await getAuthDestination();
        if (!cancelled && destination !== "/(tabs)/Home") {
          router.replace(destination as Href);
        }
      } catch {
        // En cas d'erreur réseau, on laisse l'écran Home affiché.
      }
    };

    guard();
    return () => {
      cancelled = true;
    };
  }, [router]);

  // Reprogramme les rappels locaux à chaque ouverture de l'application,
  // pour qu'ils restent synchronisés avec ce qui est actif côté serveur.
  useEffect(() => {
    let cancelled = false;

    getReminders()
      .then((reminders) => {
        if (!cancelled) syncReminderNotifications(reminders).catch(() => {});
      })
      .catch(() => {
        // Pas grave : les notifications déjà programmées restent actives.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Tabs
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen name="Home" />
      <Tabs.Screen name="nutrition" />
      <Tabs.Screen name="chatbot" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
