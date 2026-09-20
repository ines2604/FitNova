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

// ============ Notifications de jeûne ============
// Un jeûne n'a jamais qu'une seule notification de fin programmée à la fois
// (le stockage garde juste le dernier id par jeûne, pas un historique).
const FASTING_STORAGE_KEY = "@fitnova_fasting_notification_ids";

type FastingScheduleMap = Record<string, string[]>;

async function loadFastingScheduleMap(): Promise<FastingScheduleMap> {
  try {
    const raw = await AsyncStorage.getItem(FASTING_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as FastingScheduleMap) : {};
  } catch {
    return {};
  }
}

async function saveFastingScheduleMap(map: FastingScheduleMap) {
  await AsyncStorage.setItem(FASTING_STORAGE_KEY, JSON.stringify(map));
}

/**
 * Notifie immédiatement le début d'un jeûne (appelé juste après le démarrage
 * côté serveur), et programme une notification à l'heure de fin prévue.
 */
export async function notifyFastStarted(fastId: number, endAt: Date) {
  const granted = await ensureNotificationPermission();
  if (!granted) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "🔥 Jeûne commencé",
      body: "Ton jeûne a démarré. Courage, tu peux le faire !",
      sound: true,
    },
    trigger: null, // immédiat
  });

  await scheduleFastEndNotification(fastId, endAt);
}

/**
 * Notifie immédiatement que le jeûne vient d'être clôturé par l'utilisateur
 * (appelé juste après « Terminer » côté serveur). Ne lève jamais d'erreur :
 * une notification qui échoue ne doit pas faire croire que la fin du jeûne
 * a échoué alors qu'elle est déjà enregistrée.
 */
export async function notifyFastCompleted() {
  try {
    const granted = await ensureNotificationPermission();
    if (!granted) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🎉 Jeûne terminé",
        body: "Bravo, ton jeûne est enregistré. Pense à bien t'hydrater et à reprendre en douceur.",
        sound: true,
      },
      trigger: null, // immédiat
    });
  } catch (error) {
    console.warn("Erreur de notification (jeûne terminé) :", error);
  }
}

/** Programme (ou reprogramme) la notification de fin de jeûne. */
export async function scheduleFastEndNotification(fastId: number, endAt: Date) {
  const granted = await ensureNotificationPermission();
  const map = await loadFastingScheduleMap();

  await cancelIds(map[String(fastId)] || []);
  delete map[String(fastId)];

  if (granted && endAt.getTime() > Date.now()) {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: "🎉 Jeûne terminé",
          body: "Bravo, la durée de ton jeûne est atteinte ! Tu peux le clôturer.",
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: endAt,
        },
      });
      map[String(fastId)] = [id];
    } catch (error) {
      console.warn("Erreur de programmation notification (fin de jeûne) :", error);
    }
  }

  await saveFastingScheduleMap(map);
}

/** Annule la notification de fin programmée pour un jeûne (terminé/annulé manuellement). */
export async function cancelFastNotifications(fastId: number) {
  const map = await loadFastingScheduleMap();
  await cancelIds(map[String(fastId)] || []);
  delete map[String(fastId)];
  await saveFastingScheduleMap(map);
}

// ============ Notifications séances sport ============
const WORKOUT_STORAGE_KEY = "@fitnova_workout_notification_ids";
const WORKOUT_REMINDER_MINUTES_BEFORE = 30;

type WorkoutScheduleMap = Record<string, string[]>;

async function loadWorkoutScheduleMap(): Promise<WorkoutScheduleMap> {
  try {
    const raw = await AsyncStorage.getItem(WORKOUT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as WorkoutScheduleMap) : {};
  } catch {
    return {};
  }
}

async function saveWorkoutScheduleMap(map: WorkoutScheduleMap) {
  await AsyncStorage.setItem(WORKOUT_STORAGE_KEY, JSON.stringify(map));
}

/** Rappel 30 min avant le début planifié (`scheduled_sessions.id`). */
export async function scheduleWorkoutReminder(
  scheduledSessionId: number,
  sessionName: string,
  startAt: Date
) {
  const granted = await ensureNotificationPermission();
  const map = await loadWorkoutScheduleMap();

  await cancelIds(map[String(scheduledSessionId)] || []);
  delete map[String(scheduledSessionId)];

  const notifyAt = new Date(startAt.getTime() - WORKOUT_REMINDER_MINUTES_BEFORE * 60 * 1000);

  if (granted && notifyAt.getTime() > Date.now()) {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: "🏋️ Séance dans 30 minutes",
          body: `${sessionName} commence bientôt, prépare-toi !`,
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: notifyAt,
        },
      });
      map[String(scheduledSessionId)] = [id];
    } catch (error) {
      console.warn("Erreur de programmation notification (séance) :", error);
    }
  }

  await saveWorkoutScheduleMap(map);
}

export async function cancelWorkoutReminder(scheduledSessionId: number) {
  const map = await loadWorkoutScheduleMap();
  await cancelIds(map[String(scheduledSessionId)] || []);
  delete map[String(scheduledSessionId)];
  await saveWorkoutScheduleMap(map);
}

// ============ Déconnexion ============
// À appeler à la déconnexion (et quand la session expire) : annule TOUTES les
// notifications programmées — rappels (eau, activité, sommeil), fin de jeûne et
// rappels de séance — et efface les identifiants mémorisés pour chacune.
// Sans ça, les notifications de l'ancien compte continuent de sonner après la
// déconnexion (elles sont programmées sur le téléphone, pas sur le serveur).
// Au prochain login, syncReminderNotifications() reprogramme uniquement les
// rappels du nouvel utilisateur.
export async function cancelAllNotifications() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.warn("Erreur d'annulation des notifications programmées :", error);
  }
  try {
    // Retire aussi de la barre de notifications celles déjà reçues.
    await Notifications.dismissAllNotificationsAsync();
  } catch (error) {
    console.warn("Erreur de suppression des notifications affichées :", error);
  }
  await AsyncStorage.multiRemove([
    STORAGE_KEY,
    FASTING_STORAGE_KEY,
    WORKOUT_STORAGE_KEY,
  ]);
}
