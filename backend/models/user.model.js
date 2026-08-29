const pool = require("../config/db");

// Créer un nouvel utilisateur (inscription classique)
const createUser = async ({ fullName, email, hashedPassword }) => {
  const [result] = await pool.query(
    `INSERT INTO users (full_name, email, password)
     VALUES (?, ?, ?)`,
    [fullName, email, hashedPassword]
  );
  return { id: result.insertId, fullName, email };
};

// Créer un utilisateur via Google (pas de mot de passe classique)
const createGoogleUser = async ({ fullName, email, googleId, profilePhoto }) => {
  const [result] = await pool.query(
    `INSERT INTO users (full_name, email, password, google_id, profile_photo, email_verified)
     VALUES (?, ?, '', ?, ?, TRUE)`,
    [fullName, email, googleId, profilePhoto]
  );
  return { id: result.insertId, fullName, email };
};

// Rechercher un utilisateur par email
const findByEmail = async (email) => {
  const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
  return rows[0];
};

// Rechercher un utilisateur par id
const findById = async (id) => {
  const [rows] = await pool.query(
    `SELECT id, full_name, email, profile_photo, email_verified, role, created_at
     FROM users WHERE id = ?`,
    [id]
  );
  return rows[0];
};

// Rechercher un utilisateur par google_id
const findByGoogleId = async (googleId) => {
  const [rows] = await pool.query("SELECT * FROM users WHERE google_id = ?", [googleId]);
  return rows[0];
};

// Lier un compte Google à un utilisateur existant (inscrit au départ par email/mot de passe)
const linkGoogleAccount = async (userId, googleId, profilePhoto) => {
  await pool.query(
    `UPDATE users SET google_id = ?, email_verified = TRUE, profile_photo = COALESCE(profile_photo, ?) WHERE id = ?`,
    [googleId, profilePhoto, userId]
  );
};

// Marquer l'email comme vérifié
const markEmailAsVerified = async (userId) => {
  await pool.query("UPDATE users SET email_verified = TRUE WHERE id = ?", [userId]);
};

// Mettre à jour le mot de passe (après reset)
const updatePassword = async (userId, hashedPassword) => {
  await pool.query("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, userId]);
};

// Mettre à jour le profil
const updateProfile = async (userId, { fullName, profilePhoto }) => {
  await pool.query(
    `UPDATE users SET full_name = ?, profile_photo = ? WHERE id = ?`,
    [fullName, profilePhoto, userId]
  );
};

module.exports = {
  createUser,
  createGoogleUser,
  findByEmail,
  findById,
  findByGoogleId,
  linkGoogleAccount,
  markEmailAsVerified,
  updatePassword,
  updateProfile,
};