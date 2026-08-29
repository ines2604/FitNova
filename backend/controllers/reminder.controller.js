const reminderModel = require("../models/reminder.model");

// POST /api/reminders — créer un rappel (eau, activité, sommeil)
const createReminder = async (req, res) => {
  try {
    const { type, time, activeDays, frequency, endTime } = req.body;
    res.status(201).json(
      await reminderModel.createReminder(req.user.id, {
        type,
        time,
        activeDays,
        frequency,
        endTime,
      })
    );
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// GET /api/reminders — liste des rappels
const getReminders = async (req, res) => {
  try {
    res.status(200).json(await reminderModel.getReminders(req.user.id));
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// PUT /api/reminders/:id — modifier un rappel (horaire, jours actifs, activation)
const updateReminder = async (req, res) => {
  try {
    const { time, activeDays, isActive, frequency, endTime } = req.body;
    const updated = await reminderModel.updateReminder(req.user.id, req.params.id, {
      time,
      activeDays,
      isActive,
      frequency,
      endTime,
    });
    if (!updated) {
      return res.status(404).json({ message: "Rappel introuvable" });
    }
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// DELETE /api/reminders/:id
const deleteReminder = async (req, res) => {
  try {
    await reminderModel.deleteReminder(req.user.id, req.params.id);
    res.status(200).json({ message: "Rappel supprimé" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

module.exports = { createReminder, getReminders, updateReminder, deleteReminder };