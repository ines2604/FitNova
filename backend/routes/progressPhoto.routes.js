const express = require("express");
const router = express.Router();
const progressPhotoController = require("../controllers/progressPhoto.controller");
const { protect } = require("../middlewares/auth.middleware");
const upload = require("../middlewares/upload.middleware");

router.get("/", protect, progressPhotoController.getHistory);
router.post("/", protect, upload.single("photo"), progressPhotoController.addPhoto);
router.delete("/:id", protect, progressPhotoController.deletePhoto);

module.exports = router;