const bcrypt = require("bcryptjs");
const userModel = require("../models/user.model");
const otpService = require("../services/otp.service");
const { generateToken } = require("../utils/jwt");
const { verifyGoogleIdToken } = require("../utils/verifyGoogleToken");

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

const isStrongPassword = (p) =>
  typeof p === "string" &&
  p.length >= 8 &&
  /[A-Z]/.test(p) &&
  /[0-9]/.test(p) &&
  /[^A-Za-z0-9]/.test(p);

// Formate un utilisateur pour la réponse API (jamais le mot de passe)
const toPublicUser = (user) => ({
  id: user.id,
  fullName: user.full_name,
  email: user.email,
  profilePhoto: user.profile_photo,
  role: user.role,
  emailVerified: !!user.email_verified,
});

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "Tous les champs sont requis" });
    }
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ message: "Email invalide" });
    }
    if (!isStrongPassword(password)) {
      return res.status(400).json({
        message:
          "Le mot de passe doit contenir au moins 8 caractères, une majuscule, un chiffre et un caractère spécial",
      });
    }

    const existingUser = await userModel.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ message: "Cet email est déjà utilisé" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await userModel.createUser({
      fullName,
      email,
      hashedPassword,
    });

    await otpService.createAndSendOtp(newUser.id, email, "email_verification");

    res.status(201).json({
      message: "Inscription réussie. Un code de vérification a été envoyé par email.",
      userId: newUser.id,
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// POST /api/auth/verify-email
const verifyEmail = async (req, res) => {
  try {
    const { userId, code } = req.body;

    if (!userId || !code) {
      return res.status(400).json({ message: "userId et code sont requis" });
    }

    const isValid = await otpService.verifyOtp(userId, code, "email_verification");
    if (!isValid) {
      return res.status(400).json({ message: "Code invalide ou expiré" });
    }

    await userModel.markEmailAsVerified(userId);

    const user = await userModel.findById(userId);
    const token = generateToken({ id: user.id, role: user.role });

    res.status(200).json({
      message: "Email vérifié avec succès",
      token,
      user: toPublicUser(user),
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// POST /api/auth/resend-otp
const resendOtp = async (req, res) => {
  try {
    const { userId, type } = req.body;

    if (!userId || !["email_verification", "password_reset"].includes(type)) {
      return res.status(400).json({ message: "Paramètres invalides" });
    }

    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    await otpService.createAndSendOtp(userId, user.email, type);
    res.status(200).json({ message: "Nouveau code envoyé par email" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email et mot de passe requis" });
    }

    const user = await userModel.findByEmail(email);
    if (!user) {
      return res.status(401).json({ message: "Email ou mot de passe incorrect" });
    }

    if (user.status === "suspended") {
      return res.status(403).json({ message: "Compte suspendu" });
    }

    const isMatch = await bcrypt.compare(password, user.password || "");
    if (!isMatch) {
      return res.status(401).json({ message: "Email ou mot de passe incorrect" });
    }

    if (!user.email_verified) {
      // On renvoie userId pour permettre au frontend de relancer directement
      // l'écran de vérification OTP sans redemander l'email
      await otpService.createAndSendOtp(user.id, user.email, "email_verification");
      return res.status(403).json({
        message: "Email non vérifié. Un nouveau code vient d'être envoyé.",
        userId: user.id,
        emailVerified: false,
      });
    }

    const token = generateToken({ id: user.id, role: user.role });

    res.status(200).json({
      token,
      user: toPublicUser(user),
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// POST /api/auth/google
// body attendu : { idToken } — le idToken est délivré par Google côté client
// (expo-auth-session). Le serveur le vérifie lui-même, il ne fait jamais
// confiance à des champs email/nom envoyés "en clair" par le client.
const googleLogin = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ message: "idToken Google requis" });
    }

    const googleUser = await verifyGoogleIdToken(idToken);

    let user = await userModel.findByGoogleId(googleUser.googleId);

    if (!user) {
      // Un compte existe peut-être déjà avec cet email (inscription classique)
      const existingByEmail = await userModel.findByEmail(googleUser.email);

      if (existingByEmail) {
        await userModel.linkGoogleAccount(
          existingByEmail.id,
          googleUser.googleId,
          googleUser.profilePhoto
        );
        user = await userModel.findById(existingByEmail.id);
      } else {
        const newUser = await userModel.createGoogleUser({
          fullName: googleUser.fullName,
          email: googleUser.email,
          googleId: googleUser.googleId,
          profilePhoto: googleUser.profilePhoto,
        });
        user = await userModel.findById(newUser.id);
      }
    }

    if (user.status === "suspended") {
      return res.status(403).json({ message: "Compte suspendu" });
    }

    const token = generateToken({ id: user.id, role: user.role || "user" });
    res.status(200).json({ token, user: toPublicUser(user) });
  } catch (error) {
    res.status(401).json({ message: "Connexion Google invalide", error: error.message });
  }
};

// POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email requis" });
    }

    const user = await userModel.findByEmail(email);
    if (!user) {
      // Réponse neutre pour éviter l'énumération d'emails
      return res.status(200).json({ message: "Si ce compte existe, un code a été envoyé" });
    }

    await otpService.createAndSendOtp(user.id, user.email, "password_reset");
    res.status(200).json({ message: "Code envoyé par email", userId: user.id });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// POST /api/auth/verify-reset-otp
// Étape intermédiaire : vérifie le code sans le consommer, pour que
// l'utilisateur puisse ensuite saisir un nouveau mot de passe.
const verifyResetOtp = async (req, res) => {
  try {
    const { userId, code } = req.body;

    if (!userId || !code) {
      return res.status(400).json({ message: "userId et code sont requis" });
    }

    const isValid = await otpService.checkOtpValidity(userId, code, "password_reset");
    if (!isValid) {
      return res.status(400).json({ message: "Code invalide ou expiré" });
    }

    res.status(200).json({ message: "Code valide" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// POST /api/auth/reset-password
const resetPassword = async (req, res) => {
  try {
    const { userId, code, newPassword } = req.body;

    if (!userId || !code || !newPassword) {
      return res.status(400).json({ message: "Tous les champs sont requis" });
    }
    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({
        message:
          "Le mot de passe doit contenir au moins 8 caractères, une majuscule, un chiffre et un caractère spécial",
      });
    }

    const isValid = await otpService.verifyOtp(userId, code, "password_reset");
    if (!isValid) {
      return res.status(400).json({ message: "Code invalide ou expiré" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await userModel.updatePassword(userId, hashedPassword);

    res.status(200).json({ message: "Mot de passe réinitialisé avec succès" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

module.exports = {
  register,
  verifyEmail,
  resendOtp,
  login,
  googleLogin,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
};