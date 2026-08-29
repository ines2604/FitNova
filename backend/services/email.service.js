const nodemailer = require("nodemailer");
require("dotenv").config();

// Configuration du transporteur SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

// Envoie un email contenant le code OTP (vérification ou reset)
const sendOtpEmail = async (to, code, type) => {
  const subject =
    type === "email_verification"
      ? "Vérification de votre adresse email"
      : "Réinitialisation de votre mot de passe";

  const message =
    type === "email_verification"
      ? `Votre code de vérification est : ${code}. Il expire dans 10 minutes.`
      : `Votre code de réinitialisation est : ${code}. Il expire dans 10 minutes.`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    text: message,
    html: `<p>${message}</p>`,
  });
};

module.exports = { sendOtpEmail };