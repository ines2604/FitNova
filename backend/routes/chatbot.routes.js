const express = require("express");
const router = express.Router();
const chatbotController = require("../controllers/chatbot.controller");
const { protect } = require("../middlewares/auth.middleware");

router.post("/conversations", protect, chatbotController.createConversation);
router.get("/conversations", protect, chatbotController.getConversations);
router.delete("/conversations/:id", protect, chatbotController.deleteConversation);
router.patch("/conversations/:id", protect, chatbotController.updateConversationTitle);
router.get("/conversations/:id/messages", protect, chatbotController.getMessages);
router.post("/conversations/:id/messages", protect, chatbotController.sendMessage);

module.exports = router;