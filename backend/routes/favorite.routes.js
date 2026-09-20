const express = require("express");
const router = express.Router();
const favoriteController = require("../controllers/favorite.controller");
const { protect } = require("../middlewares/auth.middleware");

router.get("/status", protect, favoriteController.getFavoriteStatus);
router.get("/", protect, favoriteController.getFavorites);
router.post("/", protect, favoriteController.addFavorite);
router.delete("/:id", protect, favoriteController.deleteFavorite);

module.exports = router;
