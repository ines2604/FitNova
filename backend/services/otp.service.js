const otpModel = require("../models/otp.model");
const { generateOtp, getOtpExpiry } = require("../utils/generateOtp");
const { sendOtpEmail } = require("./email.service");

// Génère un OTP, invalide les précédents, l'enregistre en base et l'envoie par email
// type: 'email_verification' | 'password_reset'
const createAndSendOtp = async (userId, email, type) => {
  await otpModel.invalidatePreviousOtps(userId, type);

  const code = generateOtp();
  const expiresAt = getOtpExpiry(10);
  await otpModel.createOtp(userId, code, type, expiresAt);
  await sendOtpEmail(email, code, type);

  return { expiresAt };
};

// Vérifie un OTP et le marque comme utilisé s'il est valide
const verifyOtp = async (userId, code, type) => {
  const otp = await otpModel.findValidOtp(userId, code, type);
  if (!otp) return false;

  await otpModel.markOtpAsUsed(otp.id);
  return true;
};

// Vérifie la validité d'un OTP SANS le consommer (utilisé pour l'étape
// intermédiaire "entrer le code" avant la saisie du nouveau mot de passe)
const checkOtpValidity = async (userId, code, type) => {
  const otp = await otpModel.findValidOtp(userId, code, type);
  return !!otp;
};

module.exports = { createAndSendOtp, verifyOtp, checkOtpValidity };