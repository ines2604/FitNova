const express = require("express");
const router = express.Router();
const profileController = require("../controllers/profile.controller");
const { protect } = require("../middlewares/auth.middleware");

router.post("/", protect, profileController.createProfile);
router.get("/", protect, profileController.getProfile);
router.put("/", protect, profileController.updateProfile);
router.get("/weight-history", protect, profileController.getWeightHistory);

module.exports = router;