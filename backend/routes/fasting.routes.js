const express = require("express");
const router = express.Router();
const fastingController = require("../controllers/fasting.controller");
const { protect } = require("../middlewares/auth.middleware");

router.get("/current", protect, fastingController.getCurrent);
router.get("/stats", protect, fastingController.getStats);
router.get("/", protect, fastingController.getCalendar);
router.post("/plan", protect, fastingController.planFast);
router.post("/start", protect, fastingController.startFast);
router.post("/:id/end", protect, fastingController.endFast);
router.post("/:id/cancel", protect, fastingController.cancelFast);

module.exports = router;
