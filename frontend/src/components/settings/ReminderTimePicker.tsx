import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import {
  dateToTimeString,
  formatReminderTime,
  timeStringToDate,
} from "@/types/reminder";

type Props = {
  visible: boolean;
  value: string;
  onClose: () => void;
  onConfirm: (time: string) => void;
};

export default function ReminderTimePicker({
  visible,
  value,
  onClose,
  onConfirm,
}: Props) {
  const [selectedDate, setSelectedDate] = useState(() =>
    timeStringToDate(formatReminderTime(value))
  );

  useEffect(() => {
    if (visible) {
      setSelectedDate(timeStringToDate(formatReminderTime(value)));
    }
  }, [visible, value]);

  const handleChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (!date) return;
    setSelectedDate(date);
    if (Platform.OS === "android") {
      onConfirm(dateToTimeString(date));
      onClose();
    }
  };

  if (!visible) return null;

  if (Platform.OS === "android") {
    return (
      <DateTimePicker
        value={selectedDate}
        mode="time"
        is24Hour
        display="default"
        onChange={handleChange}
      />
    );
  }

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
          <Text style={styles.title}>Choisir l'heure</Text>
          <DateTimePicker
            value={selectedDate}
            mode="time"
            is24Hour
            display="spinner"
            onChange={(_event, date) => {
              if (date) setSelectedDate(date);
            }}
          />
          <View style={styles.actions}>
            <Pressable style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Annuler</Text>
            </Pressable>
            <Pressable
              style={styles.confirmBtn}
              onPress={() => {
                onConfirm(dateToTimeString(selectedDate));
                onClose();
              }}
            >
              <Text style={styles.confirmText}>Confirmer</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    textAlign: "center",
    marginBottom: 8,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
  },
  cancelText: {
    color: "#475569",
    fontWeight: "600",
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#407BFF",
    alignItems: "center",
  },
  confirmText: {
    color: "#fff",
    fontWeight: "700",
  },
});
