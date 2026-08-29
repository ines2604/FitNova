const { OAuth2Client } = require("google-auth-library");
require("dotenv").config();

// Liste de tous les client IDs acceptés
const ALLOWED_CLIENT_IDS = [
  process.env.GOOGLE_CLIENT_ID,           // Web Client ID
  process.env.GOOGLE_CLIENT_ID_ANDROID,   // Android Client ID
  // Ajoutez d'autres si besoin
].filter(Boolean);

const client = new OAuth2Client();

const verifyGoogleIdToken = async (idToken) => {
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: ALLOWED_CLIENT_IDS,
    });

    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
      throw new Error("Token Google invalide");
    }

    return {
      googleId: payload.sub,
      email: payload.email,
      emailVerified: payload.email_verified,
      fullName: payload.name || payload.email.split("@")[0],
      profilePhoto: payload.picture || null,
    };
  } catch (error) {
    console.error("Erreur vérification Google:", error);
    throw new Error("Token Google invalide ou expiré");
  }
};

module.exports = { verifyGoogleIdToken };