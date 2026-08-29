import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatSleepDuration } from "@/utils/formatters";
import TimePickerModal from "./TimePickerModal";

type Props = {
  bedtime: string | null;
  wakeTime: string | null;
  durationMinutes: number | null;

  // On envoie uniquement HH:mm
  onSave: (
    bedtime: string,
    wakeTime: string
  ) => Promise<void> | void;
};

/**
 * Convertit une Date en HH:mm
 *
 * IMPORTANT :
 * On utilise getHours() et getMinutes()
 * et NON toISOString().
 *
 * Cela évite le problème UTC +1.
 */
const formatTime = (date: Date): string => {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
};

/**
 * Affichage de l'heure dans la carte.
 */
const formatTimeLabel = (date: Date | null) => {
  if (!date) {
    return "--:--";
  }

  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

/**
 * Heure par défaut du coucher.
 */
const defaultBedtime = () => {
  const date = new Date();

  date.setHours(23, 0, 0, 0);

  return date;
};

/**
 * Heure par défaut du réveil.
 */
const defaultWakeTime = () => {
  const date = new Date();

  date.setHours(7, 0, 0, 0);

  return date;
};

/**
 * Transforme une valeur venant de la BD
 * en Date locale.
 *
 * Formats acceptés :
 *
 * "22:00"
 * "22:00:00"
 *
 * et également les anciennes valeurs ISO
 * pour compatibilité avec les anciennes données.
 */
const parseTimeValue = (
  value: string | null,
  fallback: () => Date
): Date => {
  if (!value) {
    return fallback();
  }

  /**
   * Nouveau format MySQL TIME :
   * HH:mm
   * HH:mm:ss
   */
  const timeMatch = value.match(
    /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/
  );

  if (timeMatch) {
    const hours = Number(timeMatch[1]);
    const minutes = Number(timeMatch[2]);

    const date = new Date();

    date.setHours(
      hours,
      minutes,
      0,
      0
    );

    return date;
  }

  /**
   * Compatibilité avec les anciennes données
   * enregistrées en DATETIME / ISO.
   */
  const parsed = new Date(value);

  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  return fallback();
};

export default function SleepCard({
  bedtime,
  wakeTime,
  durationMinutes,
  onSave,
}: Props) {
  const hasSavedSleep =
    durationMinutes !== null &&
    durationMinutes > 0;

  const [bedTime, setBedTime] =
    useState<Date>(
      hasSavedSleep && bedtime
        ? parseTimeValue(
            bedtime,
            defaultBedtime
          )
        : defaultBedtime()
    );

  const [wakeTimeValue, setWakeTimeValue] =
    useState<Date>(
      hasSavedSleep && wakeTime
        ? parseTimeValue(
            wakeTime,
            defaultWakeTime
          )
        : defaultWakeTime()
    );

  const [dirty, setDirty] =
    useState(false);

  const [showBedPicker, setShowBedPicker] =
    useState(false);

  const [showWakePicker, setShowWakePicker] =
    useState(false);

  const [busy, setBusy] =
    useState(false);

  /**
   * Met à jour les heures lorsque les données
   * venant du backend changent.
   */
  useEffect(() => {
    setBedTime(
      hasSavedSleep && bedtime
        ? parseTimeValue(
            bedtime,
            defaultBedtime
          )
        : defaultBedtime()
    );

    setWakeTimeValue(
      hasSavedSleep && wakeTime
        ? parseTimeValue(
            wakeTime,
            defaultWakeTime
          )
        : defaultWakeTime()
    );

    setDirty(false);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    bedtime,
    wakeTime,
    durationMinutes,
  ]);

  /**
   * Enregistrement du sommeil.
   */
  const handleSave = async () => {
    if (busy) {
      return;
    }

    setBusy(true);

    try {
      /**
       * IMPORTANT :
       *
       * On envoie :
       *
       * "22:00"
       * "07:00"
       *
       * et PAS :
       *
       * "2026-08-27T21:00:00.000Z"
       *
       * donc aucune conversion UTC.
       */
      const bedtimeValue =
        formatTime(bedTime);

      const wakeTimeValueString =
        formatTime(wakeTimeValue);

      await onSave(
        bedtimeValue,
        wakeTimeValueString
      );

      setDirty(false);
    } catch (error) {
      console.error(
        "Erreur enregistrement sommeil :",
        error
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.section}>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <View style={styles.iconBubble}>
            <Ionicons
              name="moon-outline"
              size={16}
              color="#407BFF"
            />
          </View>

          <Text style={styles.title}>
            Sommeil
          </Text>
        </View>

        {busy ? (
          <ActivityIndicator
            size="small"
            color="#407BFF"
          />
        ) : (
          <Text style={styles.durationText}>
            {formatSleepDuration(
              durationMinutes
            )}
          </Text>
        )}
      </View>

      {/* TIMELINE COUCHER -> REVEIL */}
      <View style={styles.timeline}>
        <Pressable
          style={styles.timeNode}
          onPress={() =>
            setShowBedPicker(true)
          }
          disabled={busy}
        >
          <View style={styles.nodeDot}>
            <Ionicons
              name="bed-outline"
              size={15}
              color="#407BFF"
            />
          </View>
          <Text style={styles.timeValue}>
            {formatTimeLabel(bedTime)}
          </Text>
          <Text style={styles.timeLabel}>
            Coucher
          </Text>
        </Pressable>

        <View style={styles.timelineTrack}>
          <View style={styles.timelineDash} />
        </View>

        <Pressable
          style={styles.timeNode}
          onPress={() =>
            setShowWakePicker(true)
          }
          disabled={busy}
        >
          <View style={styles.nodeDot}>
            <Ionicons
              name="sunny-outline"
              size={15}
              color="#407BFF"
            />
          </View>
          <Text style={styles.timeValue}>
            {formatTimeLabel(
              wakeTimeValue
            )}
          </Text>
          <Text style={styles.timeLabel}>
            Réveil
          </Text>
        </Pressable>
      </View>

      {/* ENREGISTRER */}
      {dirty && (
        <Pressable
          style={[
            styles.saveBtn,
            busy && styles.saveBtnDisabled,
          ]}
          onPress={handleSave}
          disabled={busy}
        >
          <Text style={styles.saveBtnText}>
            Enregistrer
          </Text>
          <Ionicons
            name="checkmark"
            size={15}
            color="#407BFF"
          />
        </Pressable>
      )}

      {/* PICKER COUCHER */}
      <TimePickerModal
        visible={showBedPicker}
        value={bedTime}
        title="Heure de coucher"
        onClose={() =>
          setShowBedPicker(false)
        }
        onConfirm={(date) => {
          setBedTime(date);
          setDirty(true);
          setShowBedPicker(false);
        }}
      />

      {/* PICKER RÉVEIL */}
      <TimePickerModal
        visible={showWakePicker}
        value={wakeTimeValue}
        title="Heure de réveil"
        onClose={() =>
          setShowWakePicker(false)
        }
        onConfirm={(date) => {
          setWakeTimeValue(date);
          setDirty(true);
          setShowWakePicker(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingVertical: 18,
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  iconBubble: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#EAF0FF",
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
  },

  durationText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1E293B",
  },

  timeline: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 20,
  },

  timeNode: {
    alignItems: "center",
    width: 76,
    gap: 4,
  },

  nodeDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#EAF0FF",
    borderWidth: 2,
    borderColor: "#407BFF",
    alignItems: "center",
    justifyContent: "center",
  },

  timeValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1E293B",
    marginTop: 2,
  },

  timeLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },

  timelineTrack: {
    flex: 1,
    height: 34,
    justifyContent: "center",
  },

  timelineDash: {
    height: 2,
    borderRadius: 1,
    backgroundColor: "#E2E8F0",
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "#C7D8FF",
  },

  saveBtn: {
    marginTop: 18,
    alignSelf: "flex-end",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#407BFF",
  },

  saveBtnDisabled: {
    opacity: 0.5,
  },

  saveBtnText: {
    color: "#407BFF",
    fontWeight: "700",
    fontSize: 13,
  },
});
