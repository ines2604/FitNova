import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Reminder,
  REMINDER_LABELS,
  formatReminderTime,
  getFrequencyIntervalMinutes,
  parseActiveDays,
} from "@/types/reminder";

// Affiche la notification même si l'app est au premier plan.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const STORAGE_KEY = "@fitnova_reminder_notification_ids";
const MAX_SCHEDULED_NOTIFICATIONS = 200;

type ScheduleMap = Record<string, string[]>;

// Nos jours actifs : 0 = Lundi ... 6 = Dimanche
// expo-notifications (WeeklyTriggerInput) : 1 = Dimanche ... 7 = Samedi
const toExpoWeekday = (dayIndex: number) => ((dayIndex + 1) % 7) + 1;

const reminderMessage = (type: Reminder["type"]) => {
  switch (type) {
    case "water":
      return "C'est le moment de boire un verre d'eau 💧";
    case "activity":
      return "Un peu de mouvement te ferait du bien 🏃";
    case "sleep":
      return "Pense à préparer ton heure de coucher 😴";
    default:
      return "N'oublie pas ton objectif du jour !";
  }
};

export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;

  const requested = await Notifications.requestPermissionsAsync();
  
  return requested.granted;
}

async function loadScheduleMap(): Promise<ScheduleMap> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ScheduleMap) : {};
  } catch {
    return {};
  }
}

async function saveScheduleMap(map: ScheduleMap) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

async function cancelIds(ids: string[]) {
  await Promise.all(
    ids.map((id) =>
      Notifications.cancelScheduledNotificationAsync(id).catch(() => {})
    )
  );
}

// Construit la liste des créneaux horaires { hour, minute } d'une journée,
// entre `start` et `end`, espacés de `intervalMinutes`.
const buildDailySlots = (
  start: string,
  end: string | null,
  intervalMinutes: number
) => {
  const [startH, startM] = formatReminderTime(start).split(":").map(Number);
  const safeEnd = end && end.length >= 4 ? end : "21:00";
  const [endH, endM] = formatReminderTime(safeEnd).split(":").map(Number);

  const startTotal = startH * 60 + startM;
  const endTotal = Math.max(endH * 60 + endM, startTotal);

  const slots: { hour: number; minute: number }[] = [];
  for (let minutes = startTotal; minutes <= endTotal; minutes += intervalMinutes) {
    slots.push({ hour: Math.floor(minutes / 60) % 24, minute: minutes % 60 });
  }
  return slots.length > 0 ? slots : [{ hour: startH, minute: startM }];
};

// Reprogramme toutes les notifications locales à partir de la liste de rappels
// venant du backend. A appeler après chaque création/modification, et au
// démarrage de l'application.
export async function syncReminderNotifications(
  reminders: Reminder[]
): Promise<{ granted: boolean }> {
  const granted = await ensureNotificationPermission();
  const map = await loadScheduleMap();

  // 1. Nettoyage des anciens rappels supprimés
  const currentIds = new Set(reminders.map((reminder) => String(reminder.id)));
  for (const key of Object.keys(map)) {
    if (!currentIds.has(key)) {
      await cancelIds(map[key]);
      delete map[key];
    }
  }

  if (!granted) {
    await saveScheduleMap(map);
    return { granted: false };
  }

  let totalScheduled = 0;
  const now = new Date();

  for (const reminder of reminders) {
    // Réinitialiser les notifications pour ce rappel
    await cancelIds(map[String(reminder.id)] || []);
    delete map[String(reminder.id)];

    if (!reminder.is_active) continue;

    const activeDays = parseActiveDays(reminder.active_days); // Ex: [0, 1, 2...] (0=Lundi)
    if (activeDays.length === 0) continue;

    const intervalMinutes = getFrequencyIntervalMinutes(reminder.frequency);
    const slots = intervalMinutes
      ? buildDailySlots(reminder.time, reminder.end_time, intervalMinutes)
      : [(() => {
          const [hour, minute] = formatReminderTime(reminder.time).split(":").map(Number);
          return { hour, minute };
        })()];

    const label = REMINDER_LABELS[reminder.type];
    const newIds: string[] = [];

    // 2. Planifier sur les 2 prochains jours glissants (Aujourd'hui, Demain, Après-demain)
    for (let dayOffset = 0; dayOffset < 2; dayOffset++) {
      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() + dayOffset);

      // Conversion jour JavaScript (0=Dim, 1=Lun...) -> ton index (0=Lun, 6=Dim)
      const jsDay = targetDate.getDay();
      const currentDayIndex = (jsDay + 6) % 7;

      // Vérifier si le jour est actif dans la configuration du rappel
      if (!activeDays.includes(currentDayIndex)) continue;

      for (const slot of slots) {
        if (totalScheduled >= MAX_SCHEDULED_NOTIFICATIONS) break;

        const scheduledTime = new Date(targetDate);
        scheduledTime.setHours(slot.hour, slot.minute, 0, 0);

        // Ne pas programmer dans le passé pour la journée d'aujourd'hui
        if (scheduledTime.getTime() <= now.getTime()) continue;

        try {
          const id = await Notifications.scheduleNotificationAsync({
            content: {
              title: `${label.emoji} ${label.title}`,
              body: reminderMessage(reminder.type),
              sound: true,
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: scheduledTime,
            },
          });
          newIds.push(id);
          totalScheduled++;
        } catch (error) {
          console.warn("Erreur de programmation notification :", error);
        }
      }
    }

    if (newIds.length > 0) {
      map[String(reminder.id)] = newIds;
    }
  }

  await saveScheduleMap(map);
  return { granted: true };
}

// Annule immédiatement les notifications d'un rappel précis (ex: désactivation).
export async function cancelReminderNotifications(reminderId: number) {
  const map = await loadScheduleMap();
  const ids = map[String(reminderId)] || [];
  await cancelIds(ids);
  delete map[String(reminderId)];
  await saveScheduleMap(map);
}

// Annule tout, par exemple à la déconnexion de l'utilisateur.
export async function cancelAllReminderNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await AsyncStorage.removeItem(STORAGE_KEY);
}

export async function resetNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await AsyncStorage.removeItem(STORAGE_KEY);

  console.log("🗑️ Toutes les notifications ont été supprimées");
}