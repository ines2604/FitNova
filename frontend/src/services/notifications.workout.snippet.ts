// À ajouter à la fin de frontend/src/services/notifications.service.ts
// (même principe que les notifications de jeûne juste au-dessus : un seul id
// programmé par séance planifiée, stocké dans son propre AsyncStorage map).

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

/**
 * Programme (ou reprogramme) le rappel d'une séance planifiée, 30 minutes
 * avant l'heure prévue. `scheduledSessionId` est l'id de l'entrée calendrier
 * (`scheduled_sessions.id`), pas celui de la séance elle-même.
 */
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

/** Annule le rappel d'une séance planifiée (démarrée en avance, annulée, ou retirée du calendrier). */
export async function cancelWorkoutReminder(scheduledSessionId: number) {
  const map = await loadWorkoutScheduleMap();
  await cancelIds(map[String(scheduledSessionId)] || []);
  delete map[String(scheduledSessionId)];
  await saveWorkoutScheduleMap(map);
}
