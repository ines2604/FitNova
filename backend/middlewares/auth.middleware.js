const { verifyToken } = require("../utils/jwt");

// Vérifie que la requête contient un token JWT valide
const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Non autorisé, token manquant" });
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token); 
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token invalide ou expiré" });
  }
};

module.exports = { protect };