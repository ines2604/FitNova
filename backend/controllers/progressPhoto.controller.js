const progressPhotoModel = require("../models/progressPhoto.model");
const { tunisDate } = require("../utils/tunisTime");

// Date du jour en heure de Tunisie. Ne pas utiliser toISOString() ici : il
// donne la date UTC, donc la veille entre minuit et 1h du matin en Tunisie.
const todayDate = () => tunisDate();

const isValidDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value);

// POST /api/progress-photos — envoi d'une photo de progression (multipart, champ "photo")
// Body additionnel : weightKg (optionnel), photoDate (optionnel, "AAAA-MM-JJ", défaut aujourd'hui)
const addPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Aucune photo envoyée" });
    }

    const { weightKg, photoDate } = req.body;

    if (photoDate && !isValidDate(photoDate)) {
      return res.status(400).json({ message: "Date invalide (format attendu : AAAA-MM-JJ)" });
    }

    const photo = await progressPhotoModel.addPhoto({
      userId: req.user.id,
      imageUrl: `/uploads/${req.file.filename}`,
      weightKg: weightKg !== undefined && weightKg !== null && weightKg !== "" ? Number(weightKg) : null,
      photoDate: photoDate || todayDate(),
    });

    res.status(201).json(photo);
  } catch (error) {
    console.error("Erreur addPhoto (progress-photos) :", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// GET /api/progress-photos — historique des photos de progression de l'utilisateur
const getHistory = async (req, res) => {
  try {
    const history = await progressPhotoModel.getHistory(req.user.id);
    res.status(200).json(history);
  } catch (error) {
    console.error("Erreur getHistory (progress-photos) :", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// DELETE /api/progress-photos/:id — supprime une photo de progression
const deletePhoto = async (req, res) => {
  try {
    const deleted = await progressPhotoModel.deletePhoto(req.user.id, req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Photo introuvable" });
    }
    res.status(200).json({ message: "Photo supprimée" });
  } catch (error) {
    console.error("Erreur deletePhoto (progress-photos) :", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

module.exports = { addPhoto, getHistory, deletePhoto };