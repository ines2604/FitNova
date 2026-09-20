const express = require("express");
const router = express.Router();
const controller = require("../controllers/workoutSession.controller");
const { protect } = require("../middlewares/auth.middleware");

router.post("/", protect, controller.createSession);
router.post("/generate", protect, controller.generateSession);
router.get("/", protect, controller.getSessions);
router.get("/:id", protect, controller.getSessionById);
router.put("/:id", protect, controller.renameSession);

router.post("/:id/exercises", protect, controller.addExercise);
router.put("/:id/exercises", protect, controller.replaceExercises);
router.patch("/:id/exercises/:sessionExerciseId", protect, controller.updateExercise);
router.delete("/:id/exercises/:sessionExerciseId", protect, controller.removeExercise);

router.put("/:id/reorder", protect, controller.reorderExercises);

module.exports = router;
