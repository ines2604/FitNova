const express = require("express");
const router = express.Router();
const reminderController = require("../controllers/reminder.controller");
const { protect } = require("../middlewares/auth.middleware");

router.post("/", protect, reminderController.createReminder);
router.get("/", protect, reminderController.getReminders);
router.put("/:id", protect, reminderController.updateReminder);
router.delete("/:id", protect, reminderController.deleteReminder);

module.exports = router;