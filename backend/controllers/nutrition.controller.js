const path = require("path");
const { analyzeMealPhoto, MIME_TYPES } = require("../services/mealScanner.service");
const scanHistoryModel = require("../models/scanHistory.model");

// POST /api/nutrition/scan-meal — analyse une photo de repas (multipart, champ "photo")
const scanMeal = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Aucune photo envoyée" });
    }

    const ext = path.extname(req.file.filename).toLowerCase();
    const mimeType = MIME_TYPES[ext] || "image/jpeg";

    const result = await analyzeMealPhoto(req.file.path, mimeType);
    const photoUrl = `/uploads/${req.file.filename}`;

    // Enregistre automatiquement l'analyse dans l'historique des repas
    // scannés. On ne bloque jamais la réponse si cet enregistrement
    // échoue : ce n'est pas critique pour l'utilisateur à cet instant.
    try {
      const title =
        result.items && result.items.length > 0
          ? result.items.map((it) => it.name).slice(0, 3).join(", ")
          : "Repas analysé";

      await scanHistoryModel.addRecord({
        userId: req.user.id,
        scanType: "photo",
        title,
        imageUrl: photoUrl,
        calories: result.totalCalories,
        protein: result.totalProtein,
        carbs: result.totalCarbs,
        fat: result.totalFat,
        confidence: result.confidence,
        details: { items: result.items, note: result.note },
      });
    } catch (historyError) {
      console.error("Impossible d'enregistrer l'historique du scan photo:", historyError.message);
    }

    res.status(200).json({
      photoUrl,
      ...result,
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

module.exports = {
  scanMeal,
};
