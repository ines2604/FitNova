const mysql = require("mysql2/promise");
require("dotenv").config();
const { TUNIS_UTC_OFFSET } = require("../utils/tunisTime");

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Renvoie les colonnes DATE/DATETIME sous forme de chaînes brutes
  // ("YYYY-MM-DD"/"YYYY-MM-DD HH:mm:ss") plutôt que des objets JS Date, pour
  // éviter tout décalage de fuseau horaire à la sérialisation (même logique
  // que pour les colonnes DATE existantes, appliquée ici aussi aux DATETIME
  // utilisés par le suivi de jeûne).
  dateStrings: ["DATE", "DATETIME"],
  // Fuseau utilisé par mysql2 pour convertir les objets Date JavaScript
  // (paramètres des requêtes, colonnes TIMESTAMP) : heure de Tunisie, quel que
  // soit le fuseau de la machine qui héberge le serveur Node.
  timezone: TUNIS_UTC_OFFSET,
});

// Fuseau de chaque connexion MySQL : NOW(), CURDATE(), CURRENT_TIMESTAMP et
// les colonnes TIMESTAMP (created_at…) sont alors calculés en heure de Tunisie
// et non dans le fuseau (souvent UTC) du serveur MySQL.
pool.pool.on("connection", (connection) => {
  connection.query(`SET time_zone = '${TUNIS_UTC_OFFSET}'`);
});

pool
  .getConnection()
  .then((connection) => {
    console.log("Connexion à MySQL réussie");
    connection.release();
  })
  .catch((err) => {
    console.error("Erreur de connexion à MySQL :", err.message);
  });

module.exports = pool;