const scheduledSessionModel = require("../models/scheduledSession.model");

const today = () => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Tunis",
  }).format(new Date());
};

const handleModelError = (res, result) => {
  if (result.error === scheduledSessionModel.DUPLICATE_SLOT) {
    return res.status(409).json({
      message: "Une séance est déjà planifiée à cette date et cette heure",
    });
  }
  if (result.error === scheduledSessionModel.NOT_FOUND) {
    return res.status(404).json({ message: "Séance planifiée introuvable" });
  }
  if (result.error === scheduledSessionModel.INVALID_STATUS) {
    return res.status(409).json({ message: "Action impossible dans l'état actuel de la séance" });
  }
  return res.status(500).json({ message: "Erreur serveur" });
};

// POST /api/calendar — body: { sessionId, date: "YYYY-MM-DD", time: "HH:MM" }
const schedule = async (req, res) => {
  try {
    const { sessionId, date, time } = req.body;
    if (!sessionId || !date || !time) {
      return res.status(400).json({ message: "sessionId, date et time sont requis" });
    }
    const result = await scheduledSessionModel.schedule(req.user.id, { sessionId, date, time });
    if (result && result.error) return handleModelError(res, result);
    res.status(201).json(result);
  } catch (error) {
    console.error("Erreur schedule :", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// POST /api/calendar/start-now — body: { sessionId }
const startNow = async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ message: "sessionId est requis" });
    }
    const result = await scheduledSessionModel.startNow(req.user.id, sessionId);
    if (result && result.error) return handleModelError(res, result);
    res.status(201).json(result);
  } catch (error) {
    console.error("Erreur startNow :", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// GET /api/calendar?from=&to=
const getCalendar = async (req, res) => {
  try {
    const { from, to } = req.query;
    const entries = await scheduledSessionModel.getCalendar(req.user.id, { from, to });
    res.status(200).json(entries);
  } catch (error) {
    console.error("Erreur getCalendar :", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// GET /api/calendar/history?from=&to=&status=
const getHistory = async (req, res) => {
  try {
    const { from, to, status } = req.query;
    const entries = await scheduledSessionModel.getHistory(req.user.id, { from, to, status });
    res.status(200).json(entries);
  } catch (error) {
    console.error("Erreur getHistory :", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// GET /api/calendar/stats?days=370 — minutes d'exercice par jour
const getDurationStats = async (req, res) => {
  try {
    const days = parseInt(req.query.days, 10) || 370;
    const end = today();
    const endDate = new Date(`${end}T12:00:00`);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - (days - 1));
    const y = startDate.getFullYear();
    const mo = String(startDate.getMonth() + 1).padStart(2, "0");
    const da = String(startDate.getDate()).padStart(2, "0");
    const start = `${y}-${mo}-${da}`;

    const rows = await scheduledSessionModel.getDurationStats(req.user.id, start, end);
    const stats = rows.map((row) => ({
      date: String(row.date).slice(0, 10),
      minutes: Number(row.minutes) || 0,
    }));
    res.status(200).json(stats);
  } catch (error) {
    console.error("Erreur getDurationStats :", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// GET /api/calendar/:id
const getById = async (req, res) => {
  try {
    const entry = await scheduledSessionModel.getById(req.user.id, req.params.id);
    if (!entry) return res.status(404).json({ message: "Séance planifiée introuvable" });
    res.status(200).json(entry);
  } catch (error) {
    console.error("Erreur getById :", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

const makeStatusAction = (modelFn) => async (req, res) => {
  try {
    const result = await modelFn(req.user.id, req.params.id);
    if (result && result.error) return handleModelError(res, result);
    res.status(200).json(result);
  } catch (error) {
    console.error("Erreur action calendrier :", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

const start = makeStatusAction(scheduledSessionModel.start);
const pause = makeStatusAction(scheduledSessionModel.pause);
const cancel = async (req, res) => {
  try {
    const { actualDurationSeconds } = req.body || {};
    const result = await scheduledSessionModel.cancel(req.user.id, req.params.id, {
      actualDurationSeconds,
    });
    if (result && result.error) return handleModelError(res, result);
    res.status(200).json(result);
  } catch (error) {
    console.error("Erreur cancel :", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};
const finish = async (req, res) => {
  try {
    const { actualDurationSeconds } = req.body || {};
    const result = await scheduledSessionModel.finish(req.user.id, req.params.id, {
      actualDurationSeconds,
    });
    if (result && result.error) return handleModelError(res, result);
    res.status(200).json(result);
  } catch (error) {
    console.error("Erreur finish :", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// DELETE /api/calendar/:id
const remove = async (req, res) => {
  try {
    const deleted = await scheduledSessionModel.remove(req.user.id, req.params.id);
    if (!deleted) return res.status(404).json({ message: "Séance planifiée introuvable" });
    res.status(200).json({ message: "Séance retirée du calendrier" });
  } catch (error) {
    console.error("Erreur remove :", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

module.exports = {
  schedule,
  startNow,
  getCalendar,
  getHistory,
  getDurationStats,
  getById,
  start,
  pause,
  cancel,
  finish,
  remove,
};
