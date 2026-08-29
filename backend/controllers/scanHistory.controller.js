const scanHistoryModel = require("../models/scanHistory.model");

const parseDetails = (record) => {
  if (!record) return record;
  if (!record.details) return { ...record, details: null };
  try {
    return { ...record, details: JSON.parse(record.details) };
  } catch (e) {
    return { ...record, details: null };
  }
};

// GET /api/nutrition/history?type=photo|barcode (type optionnel)
const getHistory = async (req, res) => {
  try {
    const { type } = req.query;
    if (type && !["photo", "barcode"].includes(type)) {
      return res.status(400).json({ message: "Type invalide (photo ou barcode attendu)" });
    }
    const rows = await scanHistoryModel.getHistory(req.user.id, type);
    res.status(200).json(rows.map(parseDetails));
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// GET /api/nutrition/history/:id
const getHistoryEntry = async (req, res) => {
  try {
    const entry = await scanHistoryModel.getById(req.user.id, req.params.id);
    if (!entry) {
      return res.status(404).json({ message: "Entrée introuvable" });
    }
    res.status(200).json(parseDetails(entry));
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// POST /api/nutrition/history — enregistre manuellement une analyse
// (utilisé notamment par le scanner code-barres, dont la recherche du
// produit se fait côté client directement auprès d'Open Food Facts)
const addHistoryEntry = async (req, res) => {
  try {
    const {
      scanType,
      title,
      imageUrl,
      barcode,
      calories,
      protein,
      carbs,
      fat,
      nutriScore,
      confidence,
      details,
    } = req.body;

    if (!scanType || !["photo", "barcode"].includes(scanType)) {
      return res.status(400).json({ message: "Type invalide (photo ou barcode attendu)" });
    }
    if (!title) {
      return res.status(400).json({ message: "Le champ 'title' est requis" });
    }

    const entry = await scanHistoryModel.addRecord({
      userId: req.user.id,
      scanType,
      title,
      imageUrl,
      barcode,
      calories,
      protein,
      carbs,
      fat,
      nutriScore,
      confidence,
      details,
    });

    res.status(201).json(parseDetails(entry));
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// DELETE /api/nutrition/history/:id
const deleteHistoryEntry = async (req, res) => {
  try {
    const deleted = await scanHistoryModel.deleteRecord(req.user.id, req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Entrée introuvable" });
    }
    res.status(200).json({ message: "Entrée supprimée" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

module.exports = {
  getHistory,
  getHistoryEntry,
  addHistoryEntry,
  deleteHistoryEntry,
};
