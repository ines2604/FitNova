const exerciseModel = require("../models/exercise.model");
const favoriteModel = require("../models/favorite.model");

// GET /api/exercises?q=&bodyPart=&equipment=&page=&limit=
const getExercises = async (req, res) => {
  try {
    const result = await exerciseModel.getExercises(req.query);
    res.status(200).json(result);
  } catch (error) {
    console.error("Erreur getExercises :", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// GET /api/exercises/filters
const getFilterOptions = async (req, res) => {
  try {
    const options = await exerciseModel.getFilterOptions();
    res.status(200).json(options);
  } catch (error) {
    console.error("Erreur getFilterOptions :", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// GET /api/exercises/favorites
// Exercices favoris de l'utilisateur avec leurs détails complets (même forme
// que GET /api/exercises), du plus récemment ajouté au plus ancien. Un favori
// dont l'exercice n'existe plus dans le catalogue est simplement ignoré.
const getFavoriteExercises = async (req, res) => {
  try {
    const favorites = await favoriteModel.getFavorites(req.user.id, "exercise");
    // Les ids du dataset sont des textes ("0025") : on les garde tels quels.
    const ids = favorites
      .map((favorite) => (favorite.ref_id == null ? "" : String(favorite.ref_id).trim()))
      .filter(Boolean);

    const exercises = await exerciseModel.getExercisesByIds(ids);
    const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]));

    const items = ids.map((id) => byId.get(id)).filter(Boolean);
    res.status(200).json({ items, total: items.length });
  } catch (error) {
    console.error("Erreur getFavoriteExercises :", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// GET /api/exercises/:id?lang=fr
// Fiche détaillée avec instructions dans la langue demandée (défaut : fr ;
// lang=all renvoie toutes les langues du dataset).
const getExerciseById = async (req, res) => {
  try {
    const lang = typeof req.query.lang === "string" && req.query.lang ? req.query.lang : "fr";
    const exercise = await exerciseModel.getExerciseById(req.params.id, lang);
    if (!exercise) {
      return res.status(404).json({ message: "Exercice introuvable" });
    }
    res.status(200).json(exercise);
  } catch (error) {
    console.error("Erreur getExerciseById :", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

module.exports = {
  getExercises,
  getFilterOptions,
  getFavoriteExercises,
  getExerciseById,
};