const conversationModel = require("../models/conversation.model");
const messageModel = require("../models/message.model");
const { getChatbotReply } = require("../services/chatbot.service");

// POST /api/chatbot/conversations — créer une nouvelle conversation
const createConversation = async (req, res) => {
  try {
    const { title } = req.body;
    res.status(201).json(await conversationModel.createConversation(req.user.id, title));
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// GET /api/chatbot/conversations — historique des conversations
const getConversations = async (req, res) => {
  try {
    res.status(200).json(await conversationModel.getConversations(req.user.id));
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// GET /api/chatbot/conversations/:id/messages — messages d'une conversation
const getMessages = async (req, res) => {
  try {
    const conversation = await conversationModel.getConversationById(req.user.id, req.params.id);
    if (!conversation) return res.status(404).json({ message: "Conversation introuvable" });

    res.status(200).json(await messageModel.getMessages(req.params.id));
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// POST /api/chatbot/conversations/:id/messages — envoyer un message et recevoir la réponse du bot
const sendMessage = async (req, res) => {
  try {
    const { content } = req.body;
    const conversationId = req.params.id;

    const conversation = await conversationModel.getConversationById(req.user.id, conversationId);
    if (!conversation) return res.status(404).json({ message: "Conversation introuvable" });

    await messageModel.createMessage(conversationId, "user", content);

    const history = await messageModel.getMessages(conversationId);
    const botReply = await getChatbotReply(history);

    const botMessage = await messageModel.createMessage(conversationId, "bot", botReply);

    res.status(201).json(botMessage);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// DELETE /api/chatbot/conversations/:id
const deleteConversation = async (req, res) => {
  try {
    await conversationModel.deleteConversation(req.user.id, req.params.id);
    res.status(200).json({ message: "Conversation supprimée" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// PATCH /api/chatbot/conversations/:id — renomme une conversation
// (utilisé notamment pour dériver le titre du premier message envoyé)
const updateConversationTitle = async (req, res) => {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Titre invalide" });
    }

    const conversation = await conversationModel.getConversationById(req.user.id, req.params.id);
    if (!conversation) return res.status(404).json({ message: "Conversation introuvable" });

    await conversationModel.updateConversationTitle(req.user.id, req.params.id, title.trim());
    res.status(200).json({ ...conversation, title: title.trim() });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

module.exports = {
  createConversation,
  getConversations,
  getMessages,
  sendMessage,
  deleteConversation,
  updateConversationTitle,
};