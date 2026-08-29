const mealModel = require("../models/meal.model");

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];

// Date du jour en heure locale de Tunisie (identique à tracking.controller)
const today = () => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Tunis",
  }).format(new Date());
};

// GET /api/meals?date=YYYY-MM-DD
const getMeals = async (req, res) => {
  try {
    const date = req.query.date || today();
    const meals = await mealModel.getMealsByDate(req.user.id, date);
    res.status(200).json(meals);
  } catch (error) {
    console.error("Erreur getMeals :", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// POST /api/meals — ajoute un aliment/repas consommé (manuel, code-barres ou photo)
const addMeal = async (req, res) => {
  try {
    const {
      date,
      mealType,
      name,
      imageUrl,
      calories,
      protein,
      carbs,
      fat,
      source,
      barcode,
    } = req.body;

    if (!mealType || !MEAL_TYPES.includes(mealType)) {
      return res.status(400).json({
        message: "Type de repas invalide (breakfast, lunch, dinner ou snack attendu)",
      });
    }
    if (!name) {
      return res.status(400).json({ message: "Le nom de l'aliment est requis" });
    }
    if (calories === undefined || calories === null || Number.isNaN(Number(calories))) {
      return res.status(400).json({ message: "Les calories sont obligatoires" });
    }

    const meal = await mealModel.addMeal({
      userId: req.user.id,
      date: date || today(),
      mealType,
      name,
      imageUrl,
      calories: Number(calories),
      protein: protein !== undefined && protein !== null ? Number(protein) : null,
      carbs: carbs !== undefined && carbs !== null ? Number(carbs) : null,
      fat: fat !== undefined && fat !== null ? Number(fat) : null,
      source,
      barcode,
    });

    res.status(201).json(meal);
  } catch (error) {
    console.error("Erreur addMeal :", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// DELETE /api/meals/:id
const deleteMeal = async (req, res) => {
  try {
    const deleted = await mealModel.deleteMeal(req.user.id, req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Repas introuvable" });
    }
    res.status(200).json({ message: "Repas supprimé" });
  } catch (error) {
    console.error("Erreur deleteMeal :", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

module.exports = { getMeals, addMeal, deleteMeal };
