const express = require("express");
const router = express.Router();
const trackingController = require("../controllers/tracking.controller");
const { protect } = require("../middlewares/auth.middleware");

router.get("/", protect, trackingController.getDailyTracking);
router.post("/water", protect, trackingController.logWater);
router.post("/steps", protect, trackingController.logSteps);
router.post("/calories-burned", protect, trackingController.logCaloriesBurned);
router.post("/sleep", protect, trackingController.logSleep);

module.exports = router;