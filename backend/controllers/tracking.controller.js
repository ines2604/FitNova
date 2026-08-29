const dailyTrackingModel = require("../models/dailyTracking.model");

// Date du jour en heure locale de Tunisie
const today = () => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Tunis",
  }).format(new Date());
};

// GET /api/tracking?date=YYYY-MM-DD
const getDailyTracking = async (req, res) => {
  try {
    const date = req.query.date || today();

    const tracking = await dailyTrackingModel.getOrCreateForDate(
      req.user.id,
      date
    );

    res.status(200).json(tracking);
  } catch (error) {
    console.error("Erreur getDailyTracking :", error);

    res.status(500).json({
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

// POST /api/tracking/water
const logWater = async (req, res) => {
  try {
    const { amountMl, date } = req.body;
    const trackingDate = date || today();

    if (amountMl === undefined || amountMl === null) {
      return res.status(400).json({
        message: "La quantité d'eau est obligatoire",
      });
    }

    await dailyTrackingModel.incrementField(
      req.user.id,
      trackingDate,
      "water_intake_ml",
      amountMl
    );

    const tracking = await dailyTrackingModel.getByDate(
      req.user.id,
      trackingDate
    );

    res.status(200).json(tracking);
  } catch (error) {
    console.error("Erreur logWater :", error);

    res.status(500).json({
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

// POST /api/tracking/steps
const logSteps = async (req, res) => {
  try {
    const { steps, date } = req.body;
    const trackingDate = date || today();

    if (steps === undefined || steps === null) {
      return res.status(400).json({
        message: "Le nombre de pas est obligatoire",
      });
    }

    await dailyTrackingModel.updateFields(
      req.user.id,
      trackingDate,
      {
        steps: Number(steps),
      }
    );

    const tracking = await dailyTrackingModel.getByDate(
      req.user.id,
      trackingDate
    );

    res.status(200).json(tracking);
  } catch (error) {
    console.error("Erreur logSteps :", error);

    res.status(500).json({
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

// POST /api/tracking/calories-burned
const logCaloriesBurned = async (req, res) => {
  try {
    const { calories, date } = req.body;
    const trackingDate = date || today();

    if (calories === undefined || calories === null) {
      return res.status(400).json({
        message: "Les calories brûlées sont obligatoires",
      });
    }

    await dailyTrackingModel.updateFields(
      req.user.id,
      trackingDate,
      {
        calories_burned: Number(calories),
      }
    );

    const tracking = await dailyTrackingModel.getByDate(
      req.user.id,
      trackingDate
    );

    res.status(200).json(tracking);
  } catch (error) {
    console.error("Erreur logCaloriesBurned :", error);

    res.status(500).json({
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

// POST /api/tracking/sleep
const logSleep = async (req, res) => {
  try {
    const { bedtime, wakeTime, date } = req.body;
    const trackingDate = date || today();

    // Vérification des données
    if (!bedtime || !wakeTime) {
      return res.status(400).json({
        message:
          "L'heure de coucher et l'heure de réveil sont obligatoires",
      });
    }

    // On accepte uniquement HH:mm
    const bedtimeValid =
      /^([01]\d|2[0-3]):([0-5]\d)$/.test(bedtime);

    const wakeTimeValid =
      /^([01]\d|2[0-3]):([0-5]\d)$/.test(wakeTime);

    if (!bedtimeValid || !wakeTimeValid) {
      return res.status(400).json({
        message:
          "Format d'heure invalide. Utilisez HH:mm, par exemple 22:30",
      });
    }

    // Conversion des heures en minutes
    const [bedHour, bedMinute] = bedtime
      .split(":")
      .map(Number);

    const [wakeHour, wakeMinute] = wakeTime
      .split(":")
      .map(Number);

    let bedtimeMinutes =
      bedHour * 60 + bedMinute;

    let wakeTimeMinutes =
      wakeHour * 60 + wakeMinute;

    // Si le réveil est avant le coucher,
    // le réveil est considéré comme étant le lendemain.
    //
    // Exemple :
    // 23:00 -> 07:00
    //
    // 07:00 devient 31:00 pour le calcul.
    if (wakeTimeMinutes <= bedtimeMinutes) {
      wakeTimeMinutes += 24 * 60;
    }

    const durationMinutes =
      wakeTimeMinutes - bedtimeMinutes;

    // Sécurité : durée maximale raisonnable de 24h
    if (durationMinutes > 24 * 60) {
      return res.status(400).json({
        message: "La durée du sommeil est invalide",
      });
    }

    // On ajoute les secondes pour MySQL TIME
    const bedtimeForDb = `${bedtime}:00`;
    const wakeTimeForDb = `${wakeTime}:00`;

    console.log("Enregistrement sommeil :", {
      userId: req.user.id,
      date: trackingDate,
      bedtime: bedtimeForDb,
      wakeTime: wakeTimeForDb,
      durationMinutes,
    });

    await dailyTrackingModel.updateFields(
      req.user.id,
      trackingDate,
      {
        bedtime: bedtimeForDb,
        wake_time: wakeTimeForDb,
        sleep_duration_minutes: durationMinutes,
      }
    );

    const tracking =
      await dailyTrackingModel.getByDate(
        req.user.id,
        trackingDate
      );

    console.log("Sommeil enregistré :", tracking);

    res.status(200).json(tracking);
  } catch (error) {
    console.error("Erreur logSleep :", error);

    res.status(500).json({
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

module.exports = {
  getDailyTracking,
  logWater,
  logSteps,
  logCaloriesBurned,
  logSleep,
};