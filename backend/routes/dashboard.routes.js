const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboard.controller");
const { protect } = require("../middlewares/auth.middleware");

router.get("/", protect, dashboardController.getDashboard);

module.exports = router;