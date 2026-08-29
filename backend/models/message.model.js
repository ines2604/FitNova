const pool = require("../config/db");

// sender: 'user' | 'bot'
const createMessage = async (conversationId, sender, content) => {
  const [result] = await pool.query(
    "INSERT INTO messages (conversation_id, sender, content) VALUES (?, ?, ?)",
    [conversationId, sender, content]
  );
  return { id: result.insertId, conversationId, sender, content };
};

const getMessages = async (conversationId) => {
  const [rows] = await pool.query(
    "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
    [conversationId]
  );
  return rows;
};

module.exports = { createMessage, getMessages };