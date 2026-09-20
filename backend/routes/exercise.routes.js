const express = require("express");
const router = express.Router();
const exerciseController = require("../controllers/exercise.controller");
const { protect } = require("../middlewares/auth.middleware");

// /filters et /favorites doivent être déclarées avant /:id pour ne pas être
// interceptées par elle.
router.get("/filters", protect, exerciseController.getFilterOptions);
router.get("/favorites", protect, exerciseController.getFavoriteExercises);
router.get("/", protect, exerciseController.getExercises);
router.get("/:id", protect, exerciseController.getExerciseById);

module.exports = router;