const favoriteModel = require("../models/favorite.model");

const ITEM_TYPES = ["food", "recipe", "exercise"];

// GET /api/favorites?type=food|recipe|exercise
const getFavorites = async (req, res) => {
  try {
    const { type } = req.query;
    if (type && !ITEM_TYPES.includes(type)) {
      return res.status(400).json({ message: "Type de favori invalide" });
    }
    const favorites = await favoriteModel.getFavorites(req.user.id, type);
    res.status(200).json(favorites);
  } catch (error) {
    console.error("Erreur getFavorites :", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// GET /api/favorites/status?itemType=food&refId=xxx
const getFavoriteStatus = async (req, res) => {
  try {
    const { itemType, refId } = req.query;
    if (!itemType || !ITEM_TYPES.includes(itemType)) {
      return res.status(400).json({ message: "Type de favori invalide" });
    }
    if (!refId) {
      return res.status(200).json({ isFavorite: false, favoriteId: null });
    }
    const existing = await favoriteModel.findByRef(req.user.id, itemType, refId);
    res.status(200).json({
      isFavorite: !!existing,
      favoriteId: existing ? existing.id : null,
    });
  } catch (error) {
    console.error("Erreur getFavoriteStatus :", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// POST /api/favorites
// Pour un exercice : { itemType: "exercise", refId: <id exercice>, name, imageUrl, source: "exercice" }
const addFavorite = async (req, res) => {
  try {
    const {
      itemType,
      refId,
      name,
      imageUrl,
      calories,
      protein,
      carbs,
      fat,
      nutriScore,
      source,
    } = req.body;

    if (!itemType || !ITEM_TYPES.includes(itemType)) {
      return res.status(400).json({
        message: "Type de favori invalide (food, recipe ou exercise attendu)",
      });
    }
    if (!name) {
      return res.status(400).json({ message: "Le nom de l'élément est requis" });
    }

    const favorite = await favoriteModel.addFavorite({
      userId: req.user.id,
      itemType,
      refId,
      name,
      imageUrl,
      calories: calories !== undefined && calories !== null ? Number(calories) : null,
      protein: protein !== undefined && protein !== null ? Number(protein) : null,
      carbs: carbs !== undefined && carbs !== null ? Number(carbs) : null,
      fat: fat !== undefined && fat !== null ? Number(fat) : null,
      nutriScore,
      source: source || (itemType === "exercise" ? "exercice" : undefined),
    });

    res.status(201).json(favorite);
  } catch (error) {
    console.error("Erreur addFavorite :", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// DELETE /api/favorites/:id
const deleteFavorite = async (req, res) => {
  try {
    const deleted = await favoriteModel.deleteFavorite(req.user.id, req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Favori introuvable" });
    }
    res.status(200).json({ message: "Favori supprimé" });
  } catch (error) {
    console.error("Erreur deleteFavorite :", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

module.exports = { getFavorites, getFavoriteStatus, addFavorite, deleteFavorite };
