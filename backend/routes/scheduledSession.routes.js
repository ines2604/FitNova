const express = require("express");
const router = express.Router();
const controller = require("../controllers/scheduledSession.controller");
const { protect } = require("../middlewares/auth.middleware");

// /history, /stats et /start-now avant /:id pour ne pas être interceptées par elle.
router.get("/history", protect, controller.getHistory);
router.get("/stats", protect, controller.getDurationStats);
router.post("/start-now", protect, controller.startNow);

router.post("/", protect, controller.schedule);
router.get("/", protect, controller.getCalendar);
router.get("/:id", protect, controller.getById);
router.delete("/:id", protect, controller.remove);

router.patch("/:id/start", protect, controller.start);
router.patch("/:id/pause", protect, controller.pause);
router.patch("/:id/cancel", protect, controller.cancel);
router.patch("/:id/finish", protect, controller.finish);

module.exports = router;
