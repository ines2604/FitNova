const pool = require("../config/db");

// Créer un code OTP (vérification email ou reset mot de passe)
const createOtp = async (userId, code, type, expiresAt) => {
  const [result] = await pool.query(
    `INSERT INTO otp_codes (user_id, code, type, expires_at)
     VALUES (?, ?, ?, ?)`,
    [userId, code, type, expiresAt]
  );
  return { id: result.insertId, userId, code, type, expiresAt };
};

// Chercher un OTP valide (non utilisé, non expiré, correspondant au code et au type)
const findValidOtp = async (userId, code, type) => {
  const [rows] = await pool.query(
    `SELECT * FROM otp_codes
     WHERE user_id = ? AND code = ? AND type = ? AND is_used = FALSE AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [userId, code, type]
  );
  return rows[0];
};

// Marquer un OTP comme utilisé (à usage unique)
const markOtpAsUsed = async (otpId) => {
  await pool.query("UPDATE otp_codes SET is_used = TRUE WHERE id = ?", [otpId]);
};

// Invalider les anciens OTP d'un utilisateur pour un type donné
const invalidatePreviousOtps = async (userId, type) => {
  await pool.query(
    "UPDATE otp_codes SET is_used = TRUE WHERE user_id = ? AND type = ? AND is_used = FALSE",
    [userId, type]
  );
};

module.exports = {
  createOtp,
  findValidOtp,
  markOtpAsUsed,
  invalidatePreviousOtps,
};