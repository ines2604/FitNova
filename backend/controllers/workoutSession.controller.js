const workoutSessionModel = require("../models/workoutSession.model");
const profileModel = require("../models/profile.model");
const { generateWorkout } = require("../services/workoutGenerator.service");
const { PlannerError, validateParams } = require("../utils/workoutPlanner");

// POST /api/sessions
// body: { name, exercises: [{ exerciseId, sets, durationSeconds, restSeconds }] }
const createSession = async (req, res) => {
  try {
    const { name, exercises } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Le nom de la séance est requis" });
    }
    if (!Array.isArray(exercises) || exercises.length === 0) {
      return res.status(400).json({ message: "Au moins un exercice est requis" });
    }
    for (const ex of exercises) {
      if (!ex.exerciseId) {
        return res.status(400).json({ message: "exerciseId manquant pour un exercice" });
      }
    }
    const session = await workoutSessionModel.createSession(req.user.id, name, exercises);
    res.status(201).json(session);
  } catch (error) {
    console.error("Erreur createSession :", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// POST /api/sessions/generate — génère une séance (aperçu, rien n'est enregistré)
// body: { goal?, level, location, focus?, durationMinutes, useAi? }
//  - goal    : weight_loss | muscle_gain | maintenance (défaut : objectif du profil)
//  - level   : beginner | intermediate | advanced
//  - location: home_bodyweight | home_equipment | gym
//  - focus   : full_body | upper_body | lower_body | core (défaut : full_body)
//  - durationMinutes : entier de 10 à 90
// Renvoie { name, source, exercises: [{ exerciseId, sets, durationSeconds,
// restSeconds, ... }], totalSeconds, warnings } ; le client l'enregistre ensuite
// avec POST /api/sessions (mêmes champs exerciseId / sets / durationSeconds /
// restSeconds).
const generateSession = async (req, res) => {
  try {
    const body = req.body || {};
    let goal = body.goal;
    if (!goal) {
      const profile = await profileModel.findByUserId(req.user.id);
      goal = (profile && profile.goal) || "maintenance";
    }
    const params = validateParams({ ...body, goal });
    const plan = await generateWorkout(params, { useAi: body.useAi !== false });
    res.status(200).json(plan);
  } catch (error) {
    if (error instanceof PlannerError) {
      return res.status(error.status).json({ message: error.message });
    }
    console.error("Erreur generateSession :", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// GET /api/sessions?q=&sort=recent|duration_asc|duration_desc
const getSessions = async (req, res) => {
  try {
    const sessions = await workoutSessionModel.getSessions(
      req.user.id,
      req.query.q,
      req.query.sort
    );
    res.status(200).json(sessions);
  } catch (error) {
    console.error("Erreur getSessions :", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// GET /api/sessions/:id
const getSessionById = async (req, res) => {
  try {
    const session = await workoutSessionModel.getSessionById(req.user.id, req.params.id);
    if (!session) {
      return res.status(404).json({ message: "Séance introuvable" });
    }
    res.status(200).json(session);
  } catch (error) {
    console.error("Erreur getSessionById :", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// PUT /api/sessions/:id — renommer la séance
const renameSession = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Le nom de la séance est requis" });
    }
    const session = await workoutSessionModel.renameSession(req.user.id, req.params.id, name);
    if (!session) {
      return res.status(404).json({ message: "Séance introuvable" });
    }
    res.status(200).json(session);
  } catch (error) {
    console.error("Erreur renameSession :", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// POST /api/sessions/:id/exercises
// body: { exerciseId, sets, durationSeconds, restSeconds }
const addExercise = async (req, res) => {
  try {
    const { exerciseId, sets, durationSeconds, restSeconds } = req.body;
    if (!exerciseId) {
      return res.status(400).json({ message: "exerciseId est requis" });
    }
    const session = await workoutSessionModel.addExercise(req.user.id, req.params.id, {
      exerciseId,
      sets,
      durationSeconds,
      restSeconds,
    });
    if (!session) {
      return res.status(404).json({ message: "Séance introuvable" });
    }
    res.status(201).json(session);
  } catch (error) {
    console.error("Erreur addExercise :", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// DELETE /api/sessions/:id/exercises/:sessionExerciseId
const removeExercise = async (req, res) => {
  try {
    const session = await workoutSessionModel.removeExercise(
      req.user.id,
      req.params.id,
      req.params.sessionExerciseId
    );
    if (!session) {
      return res.status(404).json({ message: "Séance introuvable" });
    }
    res.status(200).json(session);
  } catch (error) {
    console.error("Erreur removeExercise :", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// PATCH /api/sessions/:id/exercises/:sessionExerciseId
// body: { sets?, durationSeconds?, restSeconds? }
const updateExercise = async (req, res) => {
  try {
    const { sets, durationSeconds, restSeconds } = req.body;
    const session = await workoutSessionModel.updateExercise(
      req.user.id,
      req.params.id,
      req.params.sessionExerciseId,
      { sets, durationSeconds, restSeconds }
    );
    if (!session) {
      return res.status(404).json({ message: "Séance introuvable" });
    }
    res.status(200).json(session);
  } catch (error) {
    console.error("Erreur updateExercise :", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// PUT /api/sessions/:id/reorder
// body: { order: [sessionExerciseId, ...] }
const reorderExercises = async (req, res) => {
  try {
    const { order } = req.body;
    if (!Array.isArray(order) || order.length === 0) {
      return res.status(400).json({ message: "order (liste d'identifiants) est requis" });
    }
    const session = await workoutSessionModel.reorderExercises(req.user.id, req.params.id, order);
    if (!session) {
      return res.status(404).json({ message: "Séance introuvable" });
    }
    res.status(200).json(session);
  } catch (error) {
    console.error("Erreur reorderExercises :", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// PUT /api/sessions/:id/exercises
// body: { exercises: [{ exerciseId, sets, durationSeconds, restSeconds }] } dans l'ordre voulu
const replaceExercises = async (req, res) => {
  try {
    const { exercises } = req.body;
    if (!Array.isArray(exercises) || exercises.length === 0) {
      return res.status(400).json({ message: "Au moins un exercice est requis" });
    }
    for (const ex of exercises) {
      if (!ex.exerciseId) {
        return res.status(400).json({ message: "exerciseId manquant pour un exercice" });
      }
    }
    const session = await workoutSessionModel.replaceExercises(req.user.id, req.params.id, exercises);
    if (!session) {
      return res.status(404).json({ message: "Séance introuvable" });
    }
    res.status(200).json(session);
  } catch (error) {
    console.error("Erreur replaceExercises :", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

module.exports = {
  createSession,
  generateSession,
  getSessions,
  getSessionById,
  renameSession,
  addExercise,
  removeExercise,
  updateExercise,
  reorderExercises,
  replaceExercises,
};