const pool = require("../config/db");

const createConversation = async (userId, title) => {
  const [result] = await pool.query(
    "INSERT INTO conversations (user_id, title) VALUES (?, ?)",
    [userId, title || "Nouvelle conversation"]
  );
  return { id: result.insertId, userId, title };
};

const getConversations = async (userId) => {
  const [rows] = await pool.query(
    "SELECT * FROM conversations WHERE user_id = ? ORDER BY created_at DESC",
    [userId]
  );
  return rows;
};

const getConversationById = async (userId, conversationId) => {
  const [rows] = await pool.query(
    "SELECT * FROM conversations WHERE id = ? AND user_id = ?",
    [conversationId, userId]
  );
  return rows[0];
};

const deleteConversation = async (userId, conversationId) => {
  await pool.query("DELETE FROM conversations WHERE id = ? AND user_id = ?", [
    conversationId,
    userId,
  ]);
};

const updateConversationTitle = async (userId, conversationId, title) => {
  await pool.query(
    "UPDATE conversations SET title = ? WHERE id = ? AND user_id = ?",
    [title, conversationId, userId]
  );
};

module.exports = {
  createConversation,
  getConversations,
  getConversationById,
  deleteConversation,
  updateConversationTitle,
};