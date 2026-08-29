import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import ActiveDaysPicker from "@/components/settings/ActiveDaysPicker";
import ReminderTimePicker from "@/components/settings/ReminderTimePicker";
import FrequencyPicker from "@/components/settings/FrequencyPicker";
import {
  createReminder,
  getReminders,
  updateReminder,
} from "@/services/reminder.service";
import { syncReminderNotifications } from "@/services/notifications.service";
import {
  ALL_ACTIVE_DAYS,
  DEFAULT_REMINDER_END_TIME,
  DEFAULT_REMINDER_FREQUENCY,
  DEFAULT_REMINDER_TIME,
  formatReminderTime,
  getFrequencyOption,
  isIntervalFrequency,
  REMINDER_LABELS,
  Reminder,
  ReminderFrequency,
  ReminderType,
} from "@/types/reminder";

const REMINDER_TYPES: ReminderType[] = ["water", "activity", "sleep"];

export default function SettingsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<ReminderType | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [timePickerType, setTimePickerType] = useState<ReminderType | null>(null);
  // "start" = heure exacte / début de la période, "end" = fin de la période (mode répétition)
  const [timePickerMode, setTimePickerMode] = useState<"start" | "end">("start");

  const loadReminders = useCallback(async () => {
    try {
      const data = await getReminders();
      setReminders(data);
      syncReminderNotifications(data).catch(() => {});
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Impossible de charger les rappels");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadReminders().finally(() => setLoading(false));
    }, [loadReminders])
  );

  // Reprogramme les notifications locales à partir de la liste de rappels à jour.
  const resyncNotifications = (nextReminders: Reminder[]) => {
    syncReminderNotifications(nextReminders).catch(() => {});
  };

  const getReminderByType = (type: ReminderType) =>
    reminders.find((reminder) => reminder.type === type);

  const toggleReminder = async (type: ReminderType, enabled: boolean) => {
    setSaving(type);
    try {
      const existing = getReminderByType(type);

      if (!existing) {
        if (!enabled) return;
        const created = await createReminder({
          type,
          time: DEFAULT_REMINDER_TIME,
          activeDays: ALL_ACTIVE_DAYS,
          frequency: DEFAULT_REMINDER_FREQUENCY,
          // DEFAULT_REMINDER_FREQUENCY = "once" -> pas de plage horaire.
          endTime: isIntervalFrequency(DEFAULT_REMINDER_FREQUENCY)
            ? DEFAULT_REMINDER_END_TIME
            : undefined,
        });
        const nextReminders = [...reminders, { ...created, is_active: true }];
        setReminders(nextReminders);
        resyncNotifications(nextReminders);
        return;
      }

      await updateReminder(existing.id, { isActive: enabled });
      const nextReminders = reminders.map((reminder) =>
        reminder.id === existing.id
          ? { ...reminder, is_active: enabled }
          : reminder
      );
      setReminders(nextReminders);
      resyncNotifications(nextReminders);
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Impossible de mettre à jour le rappel");
    } finally {
      setSaving(null);
    }
  };

  const updateReminderTime = async (type: ReminderType, time: string) => {
    const existing = getReminderByType(type);
    if (!existing) return;

    setSaving(type);
    try {
      await updateReminder(existing.id, { time });
      const nextReminders = reminders.map((reminder) =>
        reminder.id === existing.id ? { ...reminder, time } : reminder
      );
      setReminders(nextReminders);
      resyncNotifications(nextReminders);
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Impossible de modifier l'heure");
    } finally {
      setSaving(null);
    }
  };

  const updateReminderEndTime = async (type: ReminderType, endTime: string) => {
    const existing = getReminderByType(type);
    if (!existing) return;

    setSaving(type);
    try {
      await updateReminder(existing.id, { endTime });
      const nextReminders = reminders.map((reminder) =>
        reminder.id === existing.id ? { ...reminder, end_time: endTime } : reminder
      );
      setReminders(nextReminders);
      resyncNotifications(nextReminders);
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Impossible de modifier l'heure de fin");
    } finally {
      setSaving(null);
    }
  };

  const updateReminderFrequency = async (
    type: ReminderType,
    frequency: ReminderFrequency
  ) => {
    const existing = getReminderByType(type);
    if (!existing) return;

    // "once" n'a pas de plage horaire -> on efface end_time (null explicite,
    // pas juste absent, sinon le backend garde l'ancienne valeur).
    // Une fréquence répétée a besoin d'une end_time : on en pose une par
    // défaut si aucune n'existe déjà.
    const nextEndTime = isIntervalFrequency(frequency)
      ? existing.end_time || DEFAULT_REMINDER_END_TIME
      : null;

    setSaving(type);
    try {
      await updateReminder(existing.id, { frequency, endTime: nextEndTime });
      const nextReminders = reminders.map((reminder) =>
        reminder.id === existing.id
          ? { ...reminder, frequency, end_time: nextEndTime }
          : reminder
      );
      setReminders(nextReminders);
      resyncNotifications(nextReminders);
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Impossible de modifier la fréquence");
    } finally {
      setSaving(null);
    }
  };

  const updateReminderDays = async (type: ReminderType, activeDays: string) => {
    const existing = getReminderByType(type);
    if (!existing) return;

    setSaving(type);
    try {
      await updateReminder(existing.id, { activeDays });
      const nextReminders = reminders.map((reminder) =>
        reminder.id === existing.id ? { ...reminder, active_days: activeDays } : reminder
      );
      setReminders(nextReminders);
      resyncNotifications(nextReminders);
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Impossible de modifier les jours");
    } finally {
      setSaving(null);
    }
  };

  const activeTimePickerReminder = timePickerType
    ? getReminderByType(timePickerType)
    : null;

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#1E293B" />
        </Pressable>
        <Text style={styles.headerTitle}>Paramètres</Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#407BFF" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionTitle}>Rappels</Text>
          <Text style={styles.sectionSubtitle}>
            Active les rappels, choisis l'heure et les jours concernés.
          </Text>

          {REMINDER_TYPES.map((type) => {
            const meta = REMINDER_LABELS[type];
            const reminder = getReminderByType(type);
            const isActive = reminder ? Boolean(reminder.is_active) : false;
            const time = formatReminderTime(reminder?.time);
            const endTime = formatReminderTime(
              reminder?.end_time || DEFAULT_REMINDER_END_TIME
            );
            const activeDays = reminder?.active_days || ALL_ACTIVE_DAYS;
            const frequency = reminder?.frequency || DEFAULT_REMINDER_FREQUENCY;
            const isInterval = isIntervalFrequency(frequency);
            const frequencyLabel = getFrequencyOption(frequency).label;

            return (
              <View key={type} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>
                    {meta.emoji} {meta.title}
                  </Text>
                  <Switch
                    value={isActive}
                    onValueChange={(value) => toggleReminder(type, value)}
                    disabled={saving === type}
                    trackColor={{ false: "#CBD5E1", true: "#93C5FD" }}
                    thumbColor={isActive ? "#407BFF" : "#f4f3f4"}
                  />
                </View>

                {isActive ? (
                  <>
                    <FrequencyPicker
                      value={frequency}
                      disabled={saving === type}
                      onChange={(nextFrequency) =>
                        updateReminderFrequency(type, nextFrequency)
                      }
                    />

                    <Pressable
                      style={styles.timeRow}
                      onPress={() => {
                        setTimePickerMode("start");
                        setTimePickerType(type);
                      }}
                      disabled={saving === type}
                    >
                      <Ionicons name="time-outline" size={18} color="#64748B" />
                      <Text style={styles.timeText}>
                        {isInterval ? `Début : ${time}` : `Heure : ${time}`}
                      </Text>
                      <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                    </Pressable>

                    {isInterval ? (
                      <Pressable
                        style={styles.timeRow}
                        onPress={() => {
                          setTimePickerMode("end");
                          setTimePickerType(type);
                        }}
                        disabled={saving === type}
                      >
                        <Ionicons name="time-outline" size={18} color="#64748B" />
                        <Text style={styles.timeText}>Fin : {endTime}</Text>
                        <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                      </Pressable>
                    ) : null}

                    <Text style={styles.frequencyHint}>
                      {isInterval
                        ? `Notification ${frequencyLabel.toLowerCase()}, de ${time} à ${endTime}.`
                        : `Notification unique chaque jour actif à ${time}.`}
                    </Text>

                    <ActiveDaysPicker
                      value={activeDays}
                      disabled={saving === type}
                      onChange={(days) => updateReminderDays(type, days)}
                    />
                  </>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      )}

      <ReminderTimePicker
        visible={timePickerType !== null}
        value={
          timePickerMode === "end"
            ? formatReminderTime(
                activeTimePickerReminder?.end_time || DEFAULT_REMINDER_END_TIME
              )
            : formatReminderTime(activeTimePickerReminder?.time)
        }
        onClose={() => setTimePickerType(null)}
        onConfirm={(value) => {
          if (!timePickerType) return;
          if (timePickerMode === "end") {
            updateReminderEndTime(timePickerType, value);
          } else {
            updateReminderTime(timePickerType, value);
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F4F7FF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1E293B",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 16,
    lineHeight: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
    flex: 1,
    marginRight: 12,
  },
  timeRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timeText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
  },
  frequencyHint: {
    marginTop: 8,
    fontSize: 12,
    color: "#94A3B8",
  },
});