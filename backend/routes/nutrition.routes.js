const express = require("express");
const router = express.Router();
const nutritionController = require("../controllers/nutrition.controller");
const scanHistoryController = require("../controllers/scanHistory.controller");
const { protect } = require("../middlewares/auth.middleware");
const upload = require("../middlewares/upload.middleware");

router.post("/scan-meal", protect, upload.single("photo"), nutritionController.scanMeal);

// Historique des repas analysés (photo + code-barres)
router.get("/history", protect, scanHistoryController.getHistory);
router.get("/history/:id", protect, scanHistoryController.getHistoryEntry);
router.post("/history", protect, scanHistoryController.addHistoryEntry);
router.delete("/history/:id", protect, scanHistoryController.deleteHistoryEntry);

module.exports = router;