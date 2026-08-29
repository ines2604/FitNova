const express = require("express");
const router = express.Router();
const mealController = require("../controllers/meal.controller");
const { protect } = require("../middlewares/auth.middleware");

router.get("/", protect, mealController.getMeals);
router.post("/", protect, mealController.addMeal);
router.delete("/:id", protect, mealController.deleteMeal);

module.exports = router;
