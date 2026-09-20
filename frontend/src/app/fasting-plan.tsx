import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import ScreenHeader from "@/components/nutrition/ScreenHeader";
import { COLORS } from "@/constants/colors";
import { planFast } from "@/services/fasting.service";

const formatDateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

const formatTimeKey = (d: Date) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

const addHours = (time: string, hours: number) => {
  const [h, m] = time.split(":").map(Number);
  const total = ((h * 60 + m + Math.round(hours * 60)) % (24 * 60) + 24 * 60) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(
    2,
    "0"
  )}`;
};

const parseDateParam = (value?: string | string[]) => {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [y, m, d] = raw.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date();
};

export default function FastingPlanScreen() {
  const router = useRouter();
  const { date: dateParam } = useLocalSearchParams<{ date?: string }>();

  const [date, setDate] = useState(() => parseDateParam(dateParam));
  const [startTime, setStartTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [durationInput, setDurationInput] = useState("16");
  const [saving, setSaving] = useState(false);

  const durationHours = Number(durationInput.replace(",", "."));
  const durationValid = Number.isFinite(durationHours) && durationHours > 0 && durationHours <= 240;

  const startTimeKey = formatTimeKey(startTime);
  const endTimeKey = durationValid ? addHours(startTimeKey, durationHours) : "--:--";

  const isToday = formatDateKey(date) === formatDateKey(new Date());
  // Le champ "heure" du DateTimePicker n'a pas de date fiable associée (il
  // porte souvent la date du jour où le picker a été monté) : on recombine
  // toujours avec la date choisie pour comparer correctement à "maintenant".
  const startDateTime = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    startTime.getHours(),
    startTime.getMinutes()
  );
  const isPastTime = isToday && startDateTime.getTime() <= Date.now();

  const handleDateChange = (event: DateTimePickerEvent, value?: Date) => {
    if (Platform.OS === "android") setShowDatePicker(false);
    if (event.type === "dismissed" || !value) return;
    setDate(value);
  };

  const handleTimeChange = (event: DateTimePickerEvent, value?: Date) => {
    if (Platform.OS === "android") setShowTimePicker(false);
    if (event.type === "dismissed" || !value) return;
    setStartTime(value);
  };

  const handleSave = async () => {
    if (saving) return;
    if (!durationValid) {
      Alert.alert("Durée invalide", "Saisis un nombre d'heures valide (ex : 16).");
      return;
    }
    if (isPastTime) {
      Alert.alert(
        "Heure déjà passée",
        "Choisis une heure de début à venir pour un jeûne planifié aujourd'hui."
      );
      return;
    }
    setSaving(true);
    try {
      await planFast(formatDateKey(date), startTimeKey, durationHours);
      router.back();
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Impossible de planifier ce jeûne");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScreenHeader title="Planifier un jeûne" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.fieldLabel}>Date du jeûne</Text>
        <Pressable style={styles.fieldInput} onPress={() => setShowDatePicker(true)}>
          <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
          <Text style={styles.fieldInputText}>
            {date.toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </Text>
        </Pressable>

        <Text style={styles.fieldLabel}>Heure de début</Text>
        <Pressable
          style={[styles.fieldInput, isPastTime && styles.fieldInputError]}
          onPress={() => setShowTimePicker(true)}
        >
          <Ionicons
            name="time-outline"
            size={18}
            color={isPastTime ? COLORS.danger : COLORS.primary}
          />
          <Text style={styles.fieldInputText}>{startTimeKey}</Text>
        </Pressable>
        {isPastTime ? (
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle" size={14} color={COLORS.danger} />
            <Text style={styles.errorText}>
              Cette heure est déjà passée aujourd'hui. Choisis une heure à venir.
            </Text>
          </View>
        ) : null}

        {showDatePicker ? (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            minimumDate={new Date()}
            onChange={handleDateChange}
          />
        ) : null}

        {showTimePicker ? (
          <DateTimePicker
            value={startTime}
            mode="time"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={handleTimeChange}
          />
        ) : null}

        <Text style={styles.fieldLabel}>Durée du jeûne</Text>
        <View style={styles.durationInputRow}>
          <TextInput
            style={styles.durationInput}
            keyboardType="numeric"
            placeholder="16"
            placeholderTextColor={COLORS.textFaint}
            value={durationInput}
            onChangeText={(value) => setDurationInput(value.replace(/[^0-9.,]/g, ""))}
            maxLength={5}
          />
          <Text style={styles.durationInputUnit}>heures</Text>
        </View>

        <View style={styles.summaryCard}>
          <Ionicons name="flame-outline" size={20} color={COLORS.primary} />
          <Text style={styles.summaryText}>
            {durationValid
              ? `Jeûne de ${durationHours} h, de ${startTimeKey} à ${endTimeKey}`
              : "Saisis une durée valide pour voir l'heure de fin prévue"}
          </Text>
        </View>

        <Pressable
          style={[
            styles.saveBtn,
            (saving || !durationValid || isPastTime) && styles.saveBtnDisabled,
          ]}
          onPress={handleSave}
          disabled={saving || !durationValid || isPastTime}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={styles.saveBtnText}>Planifier</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textDark,
    marginBottom: 8,
    marginTop: 16,
  },
  fieldInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  fieldInputText: {
    fontSize: 14,
    color: COLORS.textDark,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  fieldInputError: {
    borderColor: COLORS.danger,
    backgroundColor: "#FEF2F2",
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.danger,
    fontWeight: "600",
  },
  durationInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  durationInput: {
    width: 100,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.textDark,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 12,
  },
  durationInputUnit: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: "700",
  },
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 14,
    padding: 14,
    marginTop: 20,
  },
  summaryText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1E8F4E",
    borderRadius: 14,
    paddingVertical: 15,
    gap: 8,
    marginTop: 24,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});