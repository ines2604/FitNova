import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus, Linking, Platform } from "react-native";
import { Pedometer } from "expo-sensors";
import * as HealthConnect from "react-native-health-connect";
import { logSteps, logCaloriesBurned } from "@/services/tracking.service";
import { estimateCaloriesFromSteps } from "@/utils/activity";
import { DailyTracking } from "@/types/tracking";

type Params = {
  // Le suivi live n'a de sens que pour la journée en cours (les jours
  // passés affichent simplement la valeur déjà enregistrée en base).
  enabled: boolean;
  date: string;
  weightKg?: number | null;
  initialSteps?: number;
  onSynced?: (tracking: DailyTracking) => void;
};

export type StepSource = "device" | "health_connect" | null;
// Origine du chiffre de calories affiché : soit une vraie mesure agrégée
// par Health Connect (Samsung Health, capteur, etc.), soit une estimation
// maison calculée côté app quand aucune mesure n'est disponible.
export type CaloriesSource = "health_connect" | "estimated" | null;

// Statut détaillé pour piloter l'UI (aucune saisie manuelle : soit la
// donnée vient d'une source fiable, soit on explique pourquoi elle manque).
export type StepStatus =
  | "checking"
  | "ready" // données disponibles et à jour
  | "unavailable" // capteur/API absente sur cet appareil
  | "permission_denied"
  | "health_connect_not_installed"; // Android uniquement

const HEALTH_CONNECT_PACKAGE = "com.google.android.apps.healthdata";

// Nombre de jours à rattraper automatiquement au premier accès de la
// session (jour courant inclus dans le comptage, donc 6 jours avant lui).
const BACKFILL_DAYS = 7;

const startOfDay = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (date: Date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

const toDateKey = (date: Date) => {
  // YYYY-MM-DD en heure locale (évite le décalage UTC de toISOString()).
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export function useStepTracker({
  enabled,
  date,
  weightKg,
  initialSteps = 0,
  onSynced,
}: Params) {
  const [steps, setSteps] = useState(initialSteps);
  const [caloriesBurned, setCaloriesBurned] = useState<number | null>(null);
  const [caloriesSource, setCaloriesSource] = useState<CaloriesSource>(null);
  const [status, setStatus] = useState<StepStatus>("checking");
  const [source, setSource] = useState<StepSource>(null);

  const stepsRef = useRef(steps);
  stepsRef.current = steps;

  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSyncedRef = useRef<{ steps: number; calories: number } | null>(null);
  const subscriptionRef = useRef<{ remove: () => void } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const refreshingRef = useRef(false);

  // Garde toujours la valeur déjà connue côté serveur en attendant la
  // première lecture (évite un affichage à 0 pendant le chargement) —
  // MAIS uniquement tant qu'on reste sur le même jour : `initialSteps`
  // peut transitoirement contenir la valeur d'un AUTRE jour (ex: on vient
  // de changer de date dans le WeekStrip et le fetch réseau n'a pas encore
  // renvoyé les données du nouveau jour). Sans ce garde-fou, le `Math.max`
  // verrouillait l'affichage du jour courant sur le nombre de pas plus
  // élevé d'un jour précédent, sans jamais pouvoir redescendre.
  const trackedDateRef = useRef(date);
  useEffect(() => {
    if (trackedDateRef.current !== date) {
      trackedDateRef.current = date;
      setSteps(initialSteps);
      setCaloriesBurned(null);
      setCaloriesSource(null);
      lastSyncedRef.current = null;
    } else {
      setSteps((prev) => Math.max(prev, initialSteps));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, initialSteps]);

  const syncToBackend = useCallback(
    async (stepsValue: number, caloriesValue: number | null) => {
      if (stepsValue <= 0) return;
      const resolvedCalories =
        caloriesValue ?? estimateCaloriesFromSteps(stepsValue, weightKg);
      const last = lastSyncedRef.current;
      if (last && last.steps === stepsValue && last.calories === resolvedCalories) {
        return;
      }
      lastSyncedRef.current = { steps: stepsValue, calories: resolvedCalories };
      try {
        await logSteps(stepsValue, date);
        const updated = await logCaloriesBurned(resolvedCalories, date);
        onSynced?.(updated);
      } catch {
        lastSyncedRef.current = null; // on retentera au prochain rafraîchissement
      }
    },
    [date, weightKg, onSynced]
  );

  const scheduleSync = useCallback(
    (stepsValue: number, caloriesValue: number | null) => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = setTimeout(() => {
        syncToBackend(stepsValue, caloriesValue);
      }, 2000);
    },
    [syncToBackend]
  );

  // --- iOS : CoreMotion via getStepCountAsync (historique dispo même si
  // l'app a été fermée entre-temps, l'OS enregistre en continu) ---
  const refreshFromIos = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    try {
      const now = new Date();
      const { steps: querySteps } = await Pedometer.getStepCountAsync(
        startOfDay(now),
        now
      );
      setSteps((prev) => Math.max(prev, querySteps));
      setStatus("ready");
      setSource("device");
      scheduleSync(querySteps, null);
    } catch {
      // on retentera au prochain cycle
    } finally {
      refreshingRef.current = false;
    }
  }, [scheduleSync]);

  // --- Android : Health Connect (données agrégées depuis toutes les apps
  // qui y écrivent — Samsung Health, Google Fit, etc. — exactes et
  // disponibles même si FitNova était fermée) ---
  const refreshFromHealthConnect = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    try {
      const now = new Date();
      const timeRangeFilter = {
        operator: "between" as const,
        startTime: startOfDay(now).toISOString(),
        endTime: now.toISOString(),
      };

      const [stepsResult, totalCaloriesResult] = await Promise.all([
        HealthConnect.aggregateRecord({
          recordType: "Steps",
          timeRangeFilter,
        }),
        HealthConnect.aggregateRecord({
          recordType: "TotalCaloriesBurned",
          timeRangeFilter,
        }).catch(() => null),
      ]);

      const stepsCount = stepsResult?.COUNT_TOTAL || 0;

      // TotalCaloriesBurned n'est pas toujours écrit par Samsung Health
      // (dépend de la permission accordée et de l'appareil) : on tente
      // ActiveCaloriesBurned en repli avant de basculer sur l'estimation
      // maison, pour coller le plus possible à une vraie mesure.
      let kcal = totalCaloriesResult?.ENERGY_TOTAL?.inKilocalories
        ? Math.round(totalCaloriesResult.ENERGY_TOTAL.inKilocalories)
        : null;
      let kcalSource: CaloriesSource = kcal !== null ? "health_connect" : "estimated";

      if (kcal === null) {
        try {
          const activeResult = await HealthConnect.aggregateRecord({
            recordType: "ActiveCaloriesBurned",
            timeRangeFilter,
          });
          if (activeResult?.ACTIVE_CALORIES_TOTAL?.inKilocalories) {
            kcal = Math.round(activeResult.ACTIVE_CALORIES_TOTAL.inKilocalories);
            kcalSource = "health_connect";
          }
        } catch {
          // ni TotalCaloriesBurned ni ActiveCaloriesBurned disponibles :
          // on restera sur l'estimation.
        }
      }

      setSteps((prev) => Math.max(prev, stepsCount));
      setCaloriesBurned(kcal);
      setCaloriesSource(kcalSource);
      setStatus("ready");
      setSource("health_connect");
      scheduleSync(stepsCount, kcal);
    } catch {
      // on retentera au prochain cycle
    } finally {
      refreshingRef.current = false;
    }
  }, [scheduleSync]);

  // --- Rattrapage automatique des jours passés (Android uniquement) :
  // à la première connexion réussie à Health Connect dans la session, on
  // relit les BACKFILL_DAYS-1 derniers jours et on pousse steps/calories
  // en base pour les jours qui contiennent des données mais qui n'ont
  // jamais été synchronisés (app pas ouverte ce jour-là, etc.). Ne
  // s'exécute qu'une seule fois par montage du hook, sans action de
  // l'utilisateur ni bouton dédié. ---
  const backfillDoneRef = useRef(false);

  const backfillHistory = useCallback(async () => {
    if (backfillDoneRef.current) return;
    backfillDoneRef.current = true;

    const today = startOfDay(new Date());
    const summary: string[] = [];

    for (let i = 1; i < BACKFILL_DAYS; i++) {
      const day = new Date(today);
      day.setDate(day.getDate() - i);
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);
      const dateKey = toDateKey(day);
      const timeRangeFilter = {
        operator: "between" as const,
        startTime: dayStart.toISOString(),
        endTime: dayEnd.toISOString(),
      };

      try {
        const stepsResult = await HealthConnect.aggregateRecord({
          recordType: "Steps",
          timeRangeFilter,
        });
        const stepsCount = stepsResult?.COUNT_TOTAL || 0;

        if (stepsCount <= 0) {
          summary.push(`${dateKey}: 0 pas dans Health Connect, ignoré`);
          continue;
        }

        let kcal: number | null = null;
        try {
          const totalCalories = await HealthConnect.aggregateRecord({
            recordType: "TotalCaloriesBurned",
            timeRangeFilter,
          });
          if (totalCalories?.ENERGY_TOTAL?.inKilocalories) {
            kcal = Math.round(totalCalories.ENERGY_TOTAL.inKilocalories);
          }
        } catch (e) {
          console.warn(`[backfill] TotalCaloriesBurned indisponible pour ${dateKey}:`, e);
        }
        if (kcal === null) {
          try {
            const activeCalories = await HealthConnect.aggregateRecord({
              recordType: "ActiveCaloriesBurned",
              timeRangeFilter,
            });
            if (activeCalories?.ACTIVE_CALORIES_TOTAL?.inKilocalories) {
              kcal = Math.round(activeCalories.ACTIVE_CALORIES_TOTAL.inKilocalories);
            }
          } catch (e) {
            console.warn(`[backfill] ActiveCaloriesBurned indisponible pour ${dateKey}:`, e);
          }
        }
        if (kcal === null) kcal = estimateCaloriesFromSteps(stepsCount, weightKg);

        await logSteps(stepsCount, dateKey);
        await logCaloriesBurned(kcal, dateKey);
        summary.push(`${dateKey}: OK — ${stepsCount} pas, ${kcal} kcal`);
      } catch (e) {
        summary.push(`${dateKey}: ÉCHEC — ${String(e)}`);
        console.warn(`[backfill] Échec pour ${dateKey}:`, e);
      }
    }

    console.log("[backfill] Rattrapage historique terminé :\n" + summary.join("\n"));
  }, [weightKg]);

  const openHealthConnectInstall = useCallback(() => {
    const url = `market://details?id=${HEALTH_CONNECT_PACKAGE}`;
    const fallbackUrl = `https://play.google.com/store/apps/details?id=${HEALTH_CONNECT_PACKAGE}`;
    Linking.openURL(url).catch(() => Linking.openURL(fallbackUrl));
  }, []);

  const openHealthConnectSettings = useCallback(() => {
    try {
      HealthConnect.openHealthConnectSettings();
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const setupIos = async () => {
      const isAvailable = await Pedometer.isAvailableAsync().catch(() => false);
      if (cancelled) return;
      if (!isAvailable) {
        setStatus("unavailable");
        return;
      }

      const perms = await Pedometer.getPermissionsAsync();
      let granted = !!perms.granted;
      if (!granted && perms.canAskAgain !== false) {
        const requested = await Pedometer.requestPermissionsAsync();
        granted = !!requested.granted;
      }
      if (cancelled) return;
      if (!granted) {
        setStatus("permission_denied");
        return;
      }

      await refreshFromIos();
      subscriptionRef.current = Pedometer.watchStepCount(() => {
        refreshFromIos();
      });
      // Filet de sécurité si l'app reste ouverte longtemps sans évènement.
      pollRef.current = setInterval(refreshFromIos, 30000);
    };

    const setupAndroid = async () => {
      try {
        const sdkStatus = await HealthConnect.getSdkStatus().catch(() => 1);
        if (cancelled) return;

        if (sdkStatus !== HealthConnect.SdkAvailabilityStatus.SDK_AVAILABLE) {
          setStatus("health_connect_not_installed");
          return;
        }

        await HealthConnect.initialize();
        const granted = await HealthConnect.requestPermission([
          { accessType: "read", recordType: "Steps" },
          { accessType: "read", recordType: "TotalCaloriesBurned" },
          { accessType: "read", recordType: "ActiveCaloriesBurned" },
        ]);
        if (cancelled) return;

        const hasStepsPermission = granted.some(
          (p: any) => p.recordType === "Steps"
        );
        if (!hasStepsPermission) {
          setStatus("permission_denied");
          return;
        }

        await refreshFromHealthConnect();
        // Health Connect est une base partagée alimentée en continu par
        // d'autres apps ; il suffit de relire périodiquement, aucun listener
        // "live" n'est nécessaire ni disponible.
        pollRef.current = setInterval(refreshFromHealthConnect, 30000);
        // Rattrapage silencieux des jours passés, sans bloquer l'affichage
        // du jour courant.
        backfillHistory();
      } catch (e) {
        // Sans ce filet, une erreur ici (ex: permission mal déclarée côté
        // natif) stoppait tout setupAndroid en silence : plus de lecture
        // Health Connect ni de backfill, sans aucune trace exploitable.
        console.error("[useStepTracker] Échec de la configuration Health Connect :", e);
        if (!cancelled) setStatus("permission_denied");
      }
    };

    if (Platform.OS === "ios") {
      setupIos();
    } else if (Platform.OS === "android") {
      setupAndroid();
    } else {
      setStatus("unavailable");
    }

    const appStateSub = AppState.addEventListener(
      "change",
      (state: AppStateStatus) => {
        if (state !== "active") return;
        if (Platform.OS === "ios") refreshFromIos();
        if (Platform.OS === "android") refreshFromHealthConnect();
      }
    );

    return () => {
      cancelled = true;
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
      if (pollRef.current) clearInterval(pollRef.current);
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      appStateSub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, date]);

  return {
    steps,
    caloriesBurned: caloriesBurned ?? estimateCaloriesFromSteps(steps, weightKg),
    caloriesSource: caloriesBurned !== null ? caloriesSource : "estimated",
    status, // "checking" | "ready" | "unavailable" | "permission_denied" | "health_connect_not_installed"
    source, // "device" (iOS CoreMotion) | "health_connect" (Android) | null
    requestPermission:
      Platform.OS === "ios"
        ? async () => {
            const res = await Pedometer.requestPermissionsAsync();
            if (res.granted) await refreshFromIos();
            setStatus(res.granted ? "ready" : "permission_denied");
            return !!res.granted;
          }
        : async () => {
            try {
              const granted = await HealthConnect.requestPermission([
                { accessType: "read", recordType: "Steps" },
                { accessType: "read", recordType: "TotalCaloriesBurned" },
                { accessType: "read", recordType: "ActiveCaloriesBurned" },
              ]);
              const ok = granted.some((p: any) => p.recordType === "Steps");
              if (ok) {
                await refreshFromHealthConnect();
                backfillHistory();
              }
              setStatus(ok ? "ready" : "permission_denied");
              return ok;
            } catch (e) {
              console.error("[useStepTracker] Échec de la demande de permission :", e);
              setStatus("permission_denied");
              return false;
            }
          },
    openHealthConnectInstall,
    openHealthConnectSettings,
  };
}