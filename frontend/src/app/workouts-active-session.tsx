import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import ScreenHeader from "@/components/nutrition/ScreenHeader";
import ExerciseMedia from "@/components/workouts/ExerciseMedia";
import {
  cancelScheduledSession,
  finishScheduledSession,
  getScheduledSessionById,
  pauseScheduledSession,
  startScheduledSession,
} from "@/services/calendar.service";
import { getSessionById } from "@/services/sessions.service";
import { getExerciseById } from "@/services/exercises.service";
import { cancelWorkoutReminder } from "@/services/notifications.service";
import {
  bodyPartLabel,
  equipmentLabel,
  formatExerciseName,
  splitInstructionSteps,
} from "@/utils/exerciseLabels";
import {
  buildWorkoutPlayerSteps,
  nextRestOrFollowingIndex,
  playerStorageKey,
  SavedPlayerState,
  WorkoutPlayerStep,
} from "@/utils/workoutPlayerSteps";
import { ScheduledSession } from "@/types/scheduledSession";
import { WorkoutSession } from "@/types/session";
import { Exercise } from "@/types/exercise";

const LANG = "fr";

const CANCEL_ENCOURAGEMENT =
  "Chaque effort compte. Ce n’est pas un échec : vous avez déjà bougé. Reposez-vous, puis revenez quand vous serez prêt — vous êtes sur la bonne voie.";

const formatCountdown = (seconds: number) => {
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
};

const formatTotalElapsed = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m} min ${sec} s`;
};

export default function WorkoutsActiveSessionScreen() {
  const router = useRouter();
  const { scheduledId } = useLocalSearchParams<{ scheduledId: string }>();
  const [scheduled, setScheduled] = useState<ScheduledSession | null>(null);
  const [template, setTemplate] = useState<WorkoutSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [stepIndex, setStepIndex] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [activeSeconds, setActiveSeconds] = useState(0);
  const [sessionPaused, setSessionPaused] = useState(false);

  const [exerciseDetail, setExerciseDetail] = useState<Exercise | null>(null);
  const [loadingExercise, setLoadingExercise] = useState(false);
  const [outcome, setOutcome] = useState<"completed" | "cancelled" | null>(null);

  const stepsRef = useRef<WorkoutPlayerStep[]>([]);
  const hydratedRef = useRef(false);
  const activeSecondsRef = useRef(0);
  const savedRef = useRef(false);

  const steps = useMemo(
    () => (template ? buildWorkoutPlayerSteps(template.exercises) : []),
    [template]
  );
  stepsRef.current = steps;
  activeSecondsRef.current = activeSeconds;

  const currentStep = steps[stepIndex] ?? null;
  const isComplete = steps.length > 0 && stepIndex >= steps.length;

  const persistProgress = useCallback(
    async (patch: Partial<SavedPlayerState>) => {
      if (!scheduledId) return;
      try {
        const key = playerStorageKey(scheduledId);
        const raw = await AsyncStorage.getItem(key);
        const prev: SavedPlayerState = raw
          ? (JSON.parse(raw) as SavedPlayerState)
          : { stepIndex: 0, remainingSeconds: 0, activeSeconds: 0 };
        await AsyncStorage.setItem(key, JSON.stringify({ ...prev, ...patch }));
      } catch {
        /* non bloquant */
      }
    },
    [scheduledId]
  );

  const clearProgress = useCallback(async () => {
    if (!scheduledId) return;
    await AsyncStorage.removeItem(playerStorageKey(scheduledId)).catch(() => {});
  }, [scheduledId]);

  const goToStep = useCallback(
    (index: number) => {
      const list = stepsRef.current;
      if (index >= list.length) {
        setStepIndex(list.length);
        return;
      }
      const step = list[index];
      setStepIndex(index);
      setRemaining(step.durationSeconds);
      void persistProgress({
        stepIndex: index,
        remainingSeconds: step.durationSeconds,
      });
    },
    [persistProgress]
  );

  const advanceStep = useCallback(() => {
    goToStep(stepIndex + 1);
  }, [goToStep, stepIndex]);

  const load = useCallback(async () => {
    if (!scheduledId) return;
    setLoading(true);
    hydratedRef.current = false;
    savedRef.current = false;
    setOutcome(null);
    try {
      let entry = await getScheduledSessionById(scheduledId);
      if (entry.status === "completed" || entry.status === "cancelled") {
        const session = await getSessionById(entry.session_id);
        setScheduled(entry);
        setTemplate(session);
        setOutcome(entry.status);
        savedRef.current = true;
        hydratedRef.current = true;
        return;
      }
      if (entry.status === "planned") {
        await cancelWorkoutReminder(entry.id);
        entry = await startScheduledSession(entry.id);
      }
      setSessionPaused(entry.status === "paused");

      const session = await getSessionById(entry.session_id);
      setScheduled(entry);
      setTemplate(session);

      const built = buildWorkoutPlayerSteps(session.exercises);
      const key = playerStorageKey(scheduledId);
      const raw = await AsyncStorage.getItem(key);
      if (raw) {
        const saved = JSON.parse(raw) as SavedPlayerState;
        const idx = Math.min(Math.max(0, saved.stepIndex), built.length);
        if (idx < built.length) {
          setStepIndex(idx);
          setRemaining(saved.remainingSeconds ?? built[idx].durationSeconds);
          setActiveSeconds(saved.activeSeconds ?? 0);
        } else {
          setStepIndex(built.length);
        }
      } else if (built.length > 0) {
        setStepIndex(0);
        setRemaining(built[0].durationSeconds);
        setActiveSeconds(0);
      }
      hydratedRef.current = true;
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Séance introuvable", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } finally {
      setLoading(false);
    }
  }, [scheduledId, router]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!currentStep || currentStep.kind !== "work") {
      setExerciseDetail(null);
      return;
    }
    const id = currentStep.sessionExercise.exercise_id;
    setLoadingExercise(true);
    getExerciseById(id)
      .then(setExerciseDetail)
      .catch(() => setExerciseDetail(null))
      .finally(() => setLoadingExercise(false));
  }, [currentStep?.kind, currentStep?.sessionExercise.exercise_id]);

  useEffect(() => {
    if (
      loading ||
      !hydratedRef.current ||
      sessionPaused ||
      isComplete ||
      outcome ||
      busy ||
      !currentStep
    )
      return;

    const timer = setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1));
      setActiveSeconds((a) => {
        const next = a + 1;
        void persistProgress({ activeSeconds: next });
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, sessionPaused, isComplete, outcome, busy, currentStep, stepIndex, persistProgress]);

  useEffect(() => {
    if (sessionPaused || isComplete || outcome || !currentStep || remaining > 0) return;
    const t = setTimeout(() => advanceStep(), 400);
    return () => clearTimeout(t);
  }, [remaining, sessionPaused, isComplete, outcome, currentStep, advanceStep]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    void persistProgress({ remainingSeconds: remaining, stepIndex });
  }, [remaining, stepIndex, persistProgress]);

  const handleSkipRest = () => {
    if (currentStep?.kind !== "rest") return;
    advanceStep();
  };

  const handleSkipSet = () => {
    if (currentStep?.kind !== "work") return;
    goToStep(nextRestOrFollowingIndex(stepsRef.current, stepIndex));
  };

  const handleSessionPause = async () => {
    if (!scheduled || busy) return;
    setBusy(true);
    try {
      await pauseScheduledSession(scheduled.id);
      setSessionPaused(true);
      setScheduled((s) => (s ? { ...s, status: "paused" } : s));
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Pause impossible");
    } finally {
      setBusy(false);
    }
  };

  const handleSessionResume = async () => {
    if (!scheduled || busy) return;
    setBusy(true);
    try {
      const updated = await startScheduledSession(scheduled.id);
      setScheduled(updated);
      setSessionPaused(false);
    } catch (e: any) {
      Alert.alert("Erreur", e?.message || "Reprise impossible");
    } finally {
      setBusy(false);
    }
  };

  const persistSessionEnd = useCallback(
    async (mode: "completed" | "cancelled") => {
      if (!scheduled || savedRef.current) return;
      const seconds = activeSecondsRef.current;
      savedRef.current = true;
      setBusy(true);
      try {
        await cancelWorkoutReminder(scheduled.id);
        const updated =
          mode === "completed"
            ? await finishScheduledSession(scheduled.id, seconds)
            : await cancelScheduledSession(scheduled.id, seconds);
        await clearProgress();
        setScheduled(updated);
        setOutcome(mode);
      } catch (e: any) {
        savedRef.current = false;
        Alert.alert("Erreur", e?.message || "Enregistrement impossible");
      } finally {
        setBusy(false);
      }
    },
    [scheduled, clearProgress]
  );

  useEffect(() => {
    if (!hydratedRef.current || loading || !isComplete || outcome || !scheduled) return;
    if (scheduled.status === "completed" || scheduled.status === "cancelled") {
      setOutcome(scheduled.status);
      return;
    }
    void persistSessionEnd("completed");
  }, [isComplete, loading, outcome, scheduled, persistSessionEnd]);

  const handleCancel = () => {
    if (!scheduled || busy || outcome) return;
    Alert.alert(
      "Annuler la séance",
      "La durée déjà effectuée et les calories estimées seront enregistrées.",
      [
        { text: "Non", style: "cancel" },
        {
          text: "Oui, annuler",
          style: "destructive",
          onPress: () => void persistSessionEnd("cancelled"),
        },
      ]
    );
  };

  useEffect(() => {
    if (!outcome) return;
    const t = setTimeout(() => {
      router.replace("/workouts-calendar" as never);
    }, 3500);
    return () => clearTimeout(t);
  }, [outcome, router]);

  const instructionsText =
    exerciseDetail?.instructions?.[LANG] ?? exerciseDetail?.instructions?.en ?? "";
  const instructionSteps = splitInstructionSteps(instructionsText);

  const progressLabel = currentStep
    ? currentStep.kind === "work"
      ? `Série ${currentStep.setIndex + 1} / ${currentStep.sessionExercise.sets}`
      : "Repos"
    : "";

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScreenHeader
        title={scheduled?.session_name || "Séance"}
        rightElement={
          !loading && !isComplete && !outcome ? (
            <Pressable
              hitSlop={10}
              onPress={sessionPaused ? handleSessionResume : handleSessionPause}
              disabled={busy}
            >
              <Ionicons
                name={sessionPaused ? "play" : "pause"}
                size={22}
                color={sessionPaused ? "#22C55E" : "#F59E0B"}
              />
            </Pressable>
          ) : undefined
        }
      />

      {loading || (isComplete && !outcome) ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#22C55E" />
        </View>
      ) : outcome === "completed" ? (
        <View style={styles.completeWrap}>
          <Ionicons name="checkmark-circle" size={64} color="#22C55E" />
          <Text style={styles.completeTitle}>Bravo !</Text>
          <Text style={styles.completeSubtitle}>Séance terminée</Text>
          <Text style={styles.completeMeta}>
            Vous avez brûlé ~{scheduled?.calories_burned ?? 0} kcal
          </Text>
          <Text style={styles.completeMeta}>
            en {formatTotalElapsed(scheduled?.actual_duration_seconds ?? activeSeconds)}
          </Text>
        </View>
      ) : outcome === "cancelled" ? (
        <View style={styles.completeWrap}>
          <Ionicons name="heart" size={64} color="#407BFF" />
          <Text style={styles.completeTitle}>Séance annulée</Text>
          <Text style={styles.encourageText}>{CANCEL_ENCOURAGEMENT}</Text>
        </View>
      ) : currentStep?.kind === "rest" ? (
        <View style={styles.restScreen}>
          <Text style={styles.restTitle}>Repos</Text>
          <Text style={styles.restSubtitle}>
            Avant {formatExerciseName(currentStep.sessionExercise.exercise_name)} — série{" "}
            {currentStep.setIndex + 2 <= currentStep.sessionExercise.sets
              ? currentStep.setIndex + 2
              : "suivante"}
          </Text>
          <Text style={styles.bigTimer}>{formatCountdown(remaining)}</Text>
          <Text style={styles.elapsedSmall}>Temps séance : {formatTotalElapsed(activeSeconds)}</Text>
          <Pressable style={styles.skipBtn} onPress={handleSkipRest}>
            <Ionicons name="play-skip-forward" size={20} color="#fff" />
            <Text style={styles.skipBtnText}>Passer le repos</Text>
          </Pressable>
          <Pressable style={styles.cancelLink} onPress={handleCancel}>
            <Text style={styles.cancelLinkText}>Annuler la séance</Text>
          </Pressable>
        </View>
      ) : currentStep?.kind === "work" ? (
        <ScrollView contentContainerStyle={styles.workContent}>
          <View style={styles.progressRow}>
            <Text style={styles.progressText}>
              Exercice {currentStep.exerciseIndex + 1}/{template?.exercises.length ?? 0} ·{" "}
              {progressLabel}
            </Text>
            <Text style={styles.elapsedBadge}>{formatTotalElapsed(activeSeconds)}</Text>
          </View>

          <Text style={styles.exTitle}>
            {formatExerciseName(currentStep.sessionExercise.exercise_name)}
          </Text>
          <Text style={styles.exMeta}>
            {bodyPartLabel(currentStep.sessionExercise.body_part)}
            {currentStep.sessionExercise.equipment
              ? ` · ${equipmentLabel(currentStep.sessionExercise.equipment)}`
              : ""}
          </Text>

          {loadingExercise ? (
            <ActivityIndicator color="#22C55E" style={{ marginVertical: 24 }} />
          ) : (
            <ExerciseMedia
              gifUrl={exerciseDetail?.gif_url ?? null}
              imageUrl={
                exerciseDetail?.image ?? currentStep.sessionExercise.image ?? null
              }
              height={220}
            />
          )}

          <View style={styles.chronoCard}>
            <Text style={styles.chronoLabel}>Série en cours</Text>
            <Text style={styles.chronoValue}>{formatCountdown(remaining)}</Text>
          </View>

          <Pressable style={styles.skipBtn} onPress={handleSkipSet}>
            <Ionicons name="play-skip-forward" size={20} color="#fff" />
            <Text style={styles.skipBtnText}>Passer la série</Text>
          </Pressable>

          {instructionSteps.length > 0 ? (
            <View style={styles.instructionsBox}>
              <Text style={styles.instructionsTitle}>Consignes</Text>
              {instructionSteps.slice(0, 4).map((line, i) => (
                <Text key={i} style={styles.instructionLine}>
                  {i + 1}. {line}
                </Text>
              ))}
            </View>
          ) : null}

          <Pressable style={styles.cancelLink} onPress={handleCancel}>
            <Text style={styles.cancelLinkText}>Annuler la séance</Text>
          </Pressable>
        </ScrollView>
      ) : (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Aucun exercice dans cette séance.</Text>
        </View>
      )}

      {sessionPaused && !isComplete && !outcome && !loading ? (
        <View style={styles.pauseOverlay}>
          <Ionicons name="pause-circle" size={56} color="#F59E0B" />
          <Text style={styles.pauseTitle}>Séance en pause</Text>
          <Pressable style={styles.resumeBtn} onPress={handleSessionResume} disabled={busy}>
            <Text style={styles.resumeBtnText}>Reprendre</Text>
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F4F7FF" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { color: "#94A3B8" },
  workContent: { padding: 16, paddingBottom: 40 },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  progressText: { fontSize: 12, fontWeight: "700", color: "#64748B" },
  elapsedBadge: {
    fontSize: 11,
    fontWeight: "700",
    color: "#22C55E",
    backgroundColor: "#E9FBF0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  exTitle: { fontSize: 20, fontWeight: "800", color: "#1E293B" },
  exMeta: { fontSize: 13, color: "#94A3B8", marginTop: 4, marginBottom: 12 },
  chronoCard: {
    marginTop: 16,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  chronoLabel: { fontSize: 13, color: "#64748B", fontWeight: "600" },
  chronoValue: { fontSize: 48, fontWeight: "800", color: "#22C55E", marginTop: 4 },
  instructionsBox: {
    marginTop: 16,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
  },
  instructionsTitle: { fontSize: 14, fontWeight: "700", color: "#1E293B", marginBottom: 8 },
  instructionLine: { fontSize: 13, color: "#475569", marginBottom: 6, lineHeight: 18 },
  restScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  restTitle: { fontSize: 22, fontWeight: "800", color: "#1E293B" },
  restSubtitle: { fontSize: 14, color: "#94A3B8", marginTop: 8, textAlign: "center" },
  bigTimer: { fontSize: 72, fontWeight: "800", color: "#407BFF", marginVertical: 24 },
  elapsedSmall: { fontSize: 13, color: "#64748B", marginBottom: 24 },
  skipBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#407BFF",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 16,
  },
  skipBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  completeWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  completeTitle: { fontSize: 22, fontWeight: "800", color: "#1E293B", marginTop: 16 },
  completeSubtitle: { fontSize: 16, fontWeight: "700", color: "#22C55E", marginTop: 6 },
  completeMeta: { fontSize: 15, color: "#475569", marginTop: 8, textAlign: "center" },
  encourageText: {
    fontSize: 15,
    color: "#475569",
    marginTop: 16,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  cancelLink: { alignItems: "center", marginTop: 20, paddingVertical: 8 },
  cancelLinkText: { color: "#E5493A", fontWeight: "600" },
  pauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(244,247,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  pauseTitle: { fontSize: 18, fontWeight: "800", color: "#1E293B", marginTop: 12 },
  resumeBtn: {
    marginTop: 20,
    backgroundColor: "#22C55E",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
  },
  resumeBtnText: { color: "#fff", fontWeight: "800" },
});
