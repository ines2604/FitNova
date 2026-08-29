// Génère un code OTP à 6 chiffres (ex: "042317")
const generateOtp = () => {
  return String(Math.floor(100000 + Math.random() * 900000));
};

// Calcule la date d'expiration d'un OTP (par défaut dans 10 minutes)
const getOtpExpiry = (minutes = 10) => {
  const expires = new Date();
  expires.setMinutes(expires.getMinutes() + minutes);
  return expires;
};

module.exports = { generateOtp, getOtpExpiry };