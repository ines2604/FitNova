const jwt = require("jsonwebtoken");
require("dotenv").config();

// Génère un token JWT contenant l'id et le rôle de l'utilisateur
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

// Vérifie et décode un token JWT
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = { generateToken, verifyToken };