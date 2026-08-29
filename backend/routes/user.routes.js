const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const { protect } = require("../middlewares/auth.middleware");
const upload = require("../middlewares/upload.middleware");

// Routes du profil (utilisateur connecté)
router.get("/me", protect, userController.getMe);
router.put("/me", protect, userController.updateMe);
router.put("/me/photo", protect, upload.single("photo"), userController.updateProfilePhoto);

module.exports = router;