const otpModel = require("../models/otp.model");
const otpAttemptModel = require("../models/otpAttempt.model");
const { generateOtp, getOtpExpiry } = require("../utils/generateOtp");
const { sendOtpEmail } = require("./email.service");

// Limite d'essais de saisie d'un code : au plus OTP_MAX_ATTEMPTS essais par
// période de OTP_ATTEMPT_WINDOW_MINUTES minutes (par utilisateur et par type
// de code). Au-delà, tout essai est refusé jusqu'à la fin de la période, même
// avec le bon code ou après avoir demandé un nouveau code.
const OTP_MAX_ATTEMPTS = 5;
const OTP_ATTEMPT_WINDOW_MINUTES = 15;
const OTP_ATTEMPT_WINDOW_MS = OTP_ATTEMPT_WINDOW_MINUTES * 60 * 1000;

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

// Compte l'essai, refuse si la limite est dépassée, sinon exécute la
// vérification. Résultat :
//   { status: "valid" }
//   { status: "invalid", attemptsLeft, retryAfterSeconds }
//   { status: "locked",  attemptsLeft: 0, retryAfterSeconds }
const runLimitedCheck = async (userId, type, check) => {
  const { attempts, retryAfterMs } = await otpAttemptModel.registerAttempt(
    userId,
    type,
    OTP_ATTEMPT_WINDOW_MS
  );
  const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));

  // Limite déjà atteinte : on ne regarde même pas le code.
  if (attempts > OTP_MAX_ATTEMPTS) {
    return { status: "locked", attemptsLeft: 0, retryAfterSeconds };
  }

  if (await check()) {
    await otpAttemptModel.resetAttempts(userId, type);
    return { status: "valid" };
  }

  return {
    status: "invalid",
    attemptsLeft: Math.max(0, OTP_MAX_ATTEMPTS - attempts),
    retryAfterSeconds,
  };
};

// Vérifie un OTP et le marque comme utilisé s'il est valide
const verifyOtp = (userId, code, type) =>
  runLimitedCheck(userId, type, async () => {
    const otp = await otpModel.findValidOtp(userId, code, type);
    if (!otp) return false;

    await otpModel.markOtpAsUsed(otp.id);
    return true;
  });

// Vérifie la validité d'un OTP SANS le consommer (utilisé pour l'étape
// intermédiaire "entrer le code" avant la saisie du nouveau mot de passe)
const checkOtpValidity = (userId, code, type) =>
  runLimitedCheck(userId, type, async () => {
    const otp = await otpModel.findValidOtp(userId, code, type);
    return !!otp;
  });

module.exports = {
  createAndSendOtp,
  verifyOtp,
  checkOtpValidity,
  OTP_MAX_ATTEMPTS,
  OTP_ATTEMPT_WINDOW_MINUTES,
};
