const fastingModel = require("../models/fasting.model");
const { tunisDate, tunisTime, tunisDateTime } = require("../utils/tunisTime");

// Date du jour en heure locale de Tunisie (identique aux autres contrôleurs
// de suivi : tracking.controller.js, dashboard.controller.js, meal.model.js).
const today = () => tunisDate();

const isValidDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value);
const isValidTime = (value) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);

// "AAAA-MM-JJ HH:mm" actuel en heure locale de Tunisie, pour comparer de
// façon fiable (comparaison de chaînes, zéro-paddées) à un couple
// planDate/startTime fourni par le client sans dépendre du fuseau horaire
// de l'appareil.
const nowDateTimeKey = () => tunisDateTime().slice(0, 16);

// Ajoute `hours` (peut être décimal) à une heure "HH:mm" et renvoie une
// nouvelle heure "HH:mm", en gérant le passage à travers minuit. Sert
// uniquement à calculer l'heure de fin *prévue* affichée à l'utilisateur ;
// le décompte réel (élapsé/restant) se base côté client sur l'horodatage
// complet `actual_start_at` + `duration_hours`, ce qui gère nativement le
// changement de jour.
const addHoursToTime = (time, hours) => {
  const [h, m] = time.split(":").map(Number);
  const totalMinutes = h * 60 + m + Math.round(hours * 60);
  const wrapped = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const endH = Math.floor(wrapped / 60);
  const endM = wrapped % 60;
  return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
};

// GET /api/fasting/current — le jeûne en cours ou le prochain planifié
const getCurrent = async (req, res) => {
  try {
    const fast = await fastingModel.getOpenFast(req.user.id);
    res.status(200).json(fast);
  } catch (error) {
    console.error("Erreur getCurrent (fasting) :", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// GET /api/fasting?month=YYYY-MM — jeûnes du mois, pour le calendrier
const getCalendar = async (req, res) => {
  try {
    const month = req.query.month;
    let year, m;
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      [year, m] = month.split("-").map(Number);
    } else {
      [year, m] = tunisDate().split("-").slice(0, 2).map(Number);
    }

    const rows = await fastingModel.getByMonth(req.user.id, year, m);
    res.status(200).json(rows);
  } catch (error) {
    console.error("Erreur getCalendar (fasting) :", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// GET /api/fasting/stats?days=90 — heures de jeûne réellement tenues par
// jour, pour le graphique d'évolution de la page profil.
const getStats = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 90;
    const end = today();
    const endDate = new Date(`${end}T12:00:00`);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - (days - 1));
    const y = startDate.getFullYear();
    const mo = String(startDate.getMonth() + 1).padStart(2, "0");
    const da = String(startDate.getDate()).padStart(2, "0");
    const start = `${y}-${mo}-${da}`;

    const rows = await fastingModel.getRange(req.user.id, start, end);

    const stats = rows
      .filter((f) => f.status === "completed" || f.status === "cancelled")
      .map((f) => ({
        date: f.plan_date,
        hours: f.actual_duration_minutes
          ? Math.round((f.actual_duration_minutes / 60) * 10) / 10
          : 0,
      }));

    res.status(200).json(stats);
  } catch (error) {
    console.error("Erreur getStats (fasting) :", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// POST /api/fasting/plan — planifie un jeûne à venir
// Body : { planDate: "AAAA-MM-JJ", startTime: "HH:mm", durationHours: number }
const planFast = async (req, res) => {
  try {
    const { planDate, startTime, durationHours } = req.body;

    if (!planDate || !isValidDate(planDate)) {
      return res.status(400).json({ message: "Date invalide (format attendu : AAAA-MM-JJ)" });
    }
    if (!startTime || !isValidTime(startTime)) {
      return res.status(400).json({ message: "Heure de début invalide (format attendu : HH:mm)" });
    }
    const duration = Number(durationHours);
    if (!Number.isFinite(duration) || duration <= 0 || duration > 240) {
      return res.status(400).json({ message: "Durée de jeûne invalide" });
    }

    if (`${planDate} ${startTime}` <= nowDateTimeKey()) {
      return res.status(400).json({
        message: "L'heure de début doit être dans le futur.",
      });
    }

    const existing = await fastingModel.getOpenFastForDate(req.user.id, planDate);
    if (existing) {
      return res.status(409).json({
        message: "Un jeûne est déjà planifié ou en cours ce jour-là.",
      });
    }

    const endTime = addHoursToTime(startTime, duration);
    const fast = await fastingModel.createPlanned(req.user.id, {
      planDate,
      startTime,
      endTime,
      durationHours: duration,
    });

    res.status(201).json(fast);
  } catch (error) {
    console.error("Erreur planFast :", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// POST /api/fasting/start — démarre immédiatement
// Body : { id } pour démarrer un jeûne déjà planifié,
// ou { durationHours } pour un démarrage instantané sans planification.
const startFast = async (req, res) => {
  try {
    const { id, durationHours } = req.body;

    if (id) {
      const started = await fastingModel.startPlannedFast(req.user.id, id);
      if (!started) {
        return res.status(404).json({ message: "Jeûne planifié introuvable" });
      }
      return res.status(200).json(started);
    }

    const duration = Number(durationHours);
    if (!Number.isFinite(duration) || duration <= 0 || duration > 240) {
      return res.status(400).json({ message: "Durée de jeûne invalide" });
    }

    const planDate = today();
    const existing = await fastingModel.getOpenFastForDate(req.user.id, planDate);
    if (existing) {
      return res.status(409).json({
        message: "Un jeûne est déjà planifié ou en cours aujourd'hui.",
      });
    }

    // Heure de Tunisie (et non celle du serveur Node, souvent en UTC).
    const startTime = tunisTime().slice(0, 5);
    const endTime = addHoursToTime(startTime, duration);

    const fast = await fastingModel.startQuickFast(req.user.id, {
      planDate,
      startTime,
      endTime,
      durationHours: duration,
    });

    res.status(201).json(fast);
  } catch (error) {
    console.error("Erreur startFast :", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// POST /api/fasting/:id/end — termine un jeûne actif
const endFast = async (req, res) => {
  try {
    const ended = await fastingModel.endFast(req.user.id, req.params.id);
    if (!ended) {
      return res.status(404).json({ message: "Jeûne actif introuvable" });
    }
    res.status(200).json(ended);
  } catch (error) {
    console.error("Erreur endFast :", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// POST /api/fasting/:id/cancel — annule un jeûne planifié ou actif
const cancelFast = async (req, res) => {
  try {
    const cancelled = await fastingModel.cancelFast(req.user.id, req.params.id);
    if (!cancelled) {
      return res.status(404).json({ message: "Jeûne introuvable" });
    }
    res.status(200).json(cancelled);
  } catch (error) {
    console.error("Erreur cancelFast :", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

module.exports = {
  getCurrent,
  getCalendar,
  getStats,
  planFast,
  startFast,
  endFast,
  cancelFast,
};