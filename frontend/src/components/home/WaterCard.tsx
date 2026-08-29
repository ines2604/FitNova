import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatWater } from "@/utils/formatters";

type Props = {
  currentMl: number;
  goalMl: number;
  onChange: (amountMl: number) => Promise<void> | void;
};

const QUICK_AMOUNTS = [100, 250, 500];

export default function WaterCard({ currentMl, goalMl, onChange }: Props) {
  const [customAmount, setCustomAmount] = useState("");
  const [busy, setBusy] = useState(false);

  const progress = goalMl > 0 ? Math.min(currentMl / goalMl, 1) : 0;
  const percent = Math.round(progress * 100);

  const runChange = async (amount: number) => {
    if (busy || !amount) return;
    setBusy(true);
    try {
      await onChange(amount);
    } finally {
      setBusy(false);
    }
  };

  const handleCustom = (sign: 1 | -1) => {
    const amount = parseInt(customAmount, 10);
    if (!amount || amount <= 0) return;
    runChange(amount * sign);
    setCustomAmount("");
  };

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <View style={styles.iconBubble}>
            <Ionicons name="water-outline" size={16} color="#407BFF" />
          </View>
          <Text style={styles.title}>Eau</Text>
        </View>

        {busy ? (
          <ActivityIndicator size="small" color="#407BFF" />
        ) : (
          <Text style={styles.amountText}>
            {formatWater(currentMl)}
            <Text style={styles.goalText}> / {formatWater(goalMl)}</Text>
          </Text>
        )}
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${percent}%` }]} />
      </View>
      <Text style={styles.percentText}>{percent}%</Text>

      <View style={styles.quickRow}>
        {QUICK_AMOUNTS.map((amount) => (
          <Pressable
            key={amount}
            style={({ pressed }) => [
              styles.quickPill,
              pressed && styles.quickPillPressed,
            ]}
            onPress={() => runChange(amount)}
            disabled={busy}
          >
            <Ionicons name="add" size={13} color="#407BFF" />
            <Text style={styles.quickPillText}>{amount} ml</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.customRow}>
        <TextInput
          style={styles.input}
          placeholder="Quantité personnalisée (ml)"
          placeholderTextColor="#94A3B8"
          keyboardType="number-pad"
          value={customAmount}
          onChangeText={(text) => setCustomAmount(text.replace(/[^0-9]/g, ""))}
          editable={!busy}
        />
        <Pressable
          style={styles.ghostBtn}
          onPress={() => handleCustom(-1)}
          disabled={busy}
        >
          <Ionicons name="remove" size={18} color="#407BFF" />
        </Pressable>
        <Pressable
          style={[styles.ghostBtn, styles.ghostBtnFilled]}
          onPress={() => handleCustom(1)}
          disabled={busy}
        >
          <Ionicons name="add" size={18} color="#fff" />
        </Pressable>
      </View>
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
  amountText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1E293B",
  },
  goalText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#94A3B8",
  },
  progressTrack: {
    height: 6,
    borderRadius: 4,
    backgroundColor: "#E2E8F0",
    marginTop: 16,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#407BFF",
    borderRadius: 4,
  },
  percentText: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "600",
    color: "#94A3B8",
    textAlign: "right",
  },
  quickRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  quickPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#407BFF",
  },
  quickPillPressed: {
    backgroundColor: "#EAF0FF",
  },
  quickPillText: {
    color: "#407BFF",
    fontWeight: "700",
    fontSize: 13,
  },
  customRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
    alignItems: "center",
  },
  input: {
    flex: 1,
    borderBottomWidth: 1,
    borderColor: "#E2E8F0",
    paddingVertical: 8,
    fontSize: 14,
    color: "#1E293B",
  },
  ghostBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF0FF",
  },
  ghostBtnFilled: {
    backgroundColor: "#407BFF",
  },
});
