const pool = require("../config/db");

// type: 'water' | 'activity' | 'sleep'
// frequency: 'once' | 'every_30_min' | 'every_hour' | 'every_2_hours'
const createReminder = async (
  userId,
  { type, time, activeDays, frequency = "once", endTime = null }
) => {
  const [result] = await pool.query(
    "INSERT INTO reminders (user_id, type, time, frequency, end_time, active_days, is_active) VALUES (?, ?, ?, ?, ?, ?, TRUE)",
    [userId, type, time, frequency, endTime, activeDays]
  );
  return {
    id: result.insertId,
    user_id: userId,
    type,
    time,
    frequency,
    end_time: endTime,
    active_days: activeDays,
    is_active: true,
  };
};

const getReminders = async (userId) => {
  const [rows] = await pool.query("SELECT * FROM reminders WHERE user_id = ?", [userId]);
  return rows;
};

const findById = async (userId, id) => {
  const [rows] = await pool.query(
    "SELECT * FROM reminders WHERE id = ? AND user_id = ?",
    [id, userId]
  );
  return rows[0];
};

const updateReminder = async (
  userId,
  id,
  { time, activeDays, isActive, frequency, endTime }
) => {
  const existing = await findById(userId, id);
  if (!existing) return null;

  await pool.query(
    "UPDATE reminders SET time = ?, frequency = ?, end_time = ?, active_days = ?, is_active = ? WHERE id = ? AND user_id = ?",
    [
      time ?? existing.time,
      frequency ?? existing.frequency,
      endTime !== undefined ? endTime : existing.end_time,
      activeDays ?? existing.active_days,
      isActive ?? existing.is_active,
      id,
      userId,
    ]
  );

  return findById(userId, id);
};

const deleteReminder = async (userId, id) => {
  await pool.query("DELETE FROM reminders WHERE id = ? AND user_id = ?", [id, userId]);
};

module.exports = { createReminder, getReminders, findById, updateReminder, deleteReminder };