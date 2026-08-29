import React from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatSteps, formatCalories } from "@/utils/formatters";
import { COLORS } from "@/constants/colors";
import { StepStatus, StepSource, CaloriesSource } from "@/hooks/useStepTracker";

type Props = {
  steps: number;
  goalSteps: number;
  caloriesBurned: number;
  caloriesSource?: CaloriesSource;
  isToday: boolean;
  status: StepStatus;
  source: StepSource;
  onRequestPermission: () => Promise<boolean> | boolean;
  onOpenHealthConnectInstall: () => void;
  onOpenHealthConnectSettings: () => void;
};

const STEP_COLOR = "#F08A24";

export default function StepsCard({
  steps,
  goalSteps,
  caloriesBurned,
  caloriesSource,
  isToday,
  status,
  source,
  onRequestPermission,
  onOpenHealthConnectInstall,
  onOpenHealthConnectSettings,
}: Props) {
  const progress = goalSteps > 0 ? Math.min(steps / goalSteps, 1) : 0;
  const percent = Math.round(progress * 100);

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <View style={styles.iconBubble}>
            <Ionicons name="footsteps-outline" size={16} color={STEP_COLOR} />
          </View>
          <Text style={styles.title}>Pas</Text>
        </View>

        <Text style={styles.amountText}>
          {formatSteps(steps)}
          <Text style={styles.goalText}> / {formatSteps(goalSteps)}</Text>
        </Text>
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${percent}%`, backgroundColor: STEP_COLOR },
          ]}
        />
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.percentText}>{percent}%</Text>
        <View style={styles.caloriesPill}>
          <Ionicons name="flame-outline" size={13} color="#F97316" />
          <Text style={styles.caloriesText}>
            {formatCalories(caloriesBurned)}
          </Text>
          {isToday && caloriesSource === "estimated" && (
            <Text style={styles.estimatedBadge}>estimation</Text>
          )}
        </View>
      </View>

      {!isToday && (
        <Text style={styles.hintText}>
          Donnée enregistrée pour cette journée.
        </Text>
      )}

      {isToday && status === "checking" && (
        <View style={styles.statusRow}>
          <ActivityIndicator size="small" color={STEP_COLOR} />
          <Text style={styles.statusText}>Vérification du capteur…</Text>
        </View>
      )}

      {isToday && status === "unavailable" && (
        <Text style={styles.warningText}>
          Le suivi des pas n'est pas disponible sur cet appareil.
        </Text>
      )}

      {isToday && status === "permission_denied" && (
        <Pressable style={styles.actionBtn} onPress={() => onRequestPermission()}>
          <Ionicons name="walk-outline" size={16} color={STEP_COLOR} />
          <Text style={styles.actionBtnText}>Autoriser le suivi des pas</Text>
        </Pressable>
      )}

      {isToday && status === "health_connect_not_installed" && (
        <View style={styles.hcBlock}>
          <Text style={styles.warningText}>
            Le suivi des pas sur Android nécessite l'app Health Connect
            (qui centralise les données de Samsung Health, Google Fit, etc.).
          </Text>
          <Pressable style={styles.actionBtn} onPress={onOpenHealthConnectInstall}>
            <Ionicons name="download-outline" size={16} color={STEP_COLOR} />
            <Text style={styles.actionBtnText}>Installer Health Connect</Text>
          </Pressable>
        </View>
      )}

      {isToday && status === "ready" && (
        <Pressable
          style={styles.hintRow}
          onPress={
            source === "health_connect" ? onOpenHealthConnectSettings : undefined
          }
          disabled={source !== "health_connect"}
        >
          <Ionicons name="sync-outline" size={12} color={COLORS.textFaint} />
          <Text style={styles.hintText}>
            {source === "health_connect"
              ? caloriesSource === "estimated"
                ? "Pas synchronisés via Health Connect · calories estimées (mesure indisponible)"
                : "Synchronisé via Health Connect"
              : Platform.OS === "ios"
                ? "Pas synchronisés via le capteur de mouvement · calories estimées"
                : "Synchronisé automatiquement"}
          </Text>
        </Pressable>
      )}
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
    backgroundColor: "#FDECD8",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textDark,
  },
  amountText: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.textDark,
  },
  goalText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textFaint,
  },
  progressTrack: {
    height: 6,
    borderRadius: 4,
    backgroundColor: COLORS.border,
    marginTop: 16,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  percentText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textFaint,
  },
  caloriesPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  caloriesText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#F97316",
  },
  estimatedBadge: {
    fontSize: 9,
    fontWeight: "700",
    color: COLORS.textFaint,
    textTransform: "uppercase",
    marginLeft: 2,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
  },
  statusText: {
    fontSize: 12,
    color: COLORS.textFaint,
  },
  hintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
  },
  hintText: {
    fontSize: 12,
    color: COLORS.textFaint,
  },
  warningText: {
    marginTop: 14,
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 17,
  },
  hcBlock: {
    gap: 10,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: STEP_COLOR,
  },
  actionBtnText: {
    color: STEP_COLOR,
    fontWeight: "700",
    fontSize: 13,
  },
});