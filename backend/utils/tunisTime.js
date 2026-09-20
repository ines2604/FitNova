// Toutes les heures enregistrées par l'application sont en heure de Tunisie
// (Africa/Tunis = UTC+1 toute l'année, sans changement d'heure depuis 2008).
//
// On ne dépend donc ni du fuseau du serveur Node, ni de celui du serveur MySQL :
// - config/db.js force le fuseau de chaque connexion MySQL (NOW(), CURDATE()…)
// - ce fichier fournit la date/heure courante en Tunisie côté JavaScript
//   (à utiliser À LA PLACE de toISOString(), toTimeString() ou getHours(),
//   qui donnent soit de l'UTC, soit l'heure du serveur).

const TUNIS_TZ = "Africa/Tunis";
const TUNIS_UTC_OFFSET = "+01:00";

const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TUNIS_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  // "h23" évite l'heure "24:00:00" que hour12:false peut renvoyer à minuit.
  hourCycle: "h23",
});

const partsOf = (date = new Date()) => {
  const map = {};
  for (const part of formatter.formatToParts(date)) {
    map[part.type] = part.value;
  }
  return map;
};

// "AAAA-MM-JJ"
const tunisDate = (date = new Date()) => {
  const p = partsOf(date);
  return `${p.year}-${p.month}-${p.day}`;
};

// "HH:mm:ss"
const tunisTime = (date = new Date()) => {
  const p = partsOf(date);
  return `${p.hour}:${p.minute}:${p.second}`;
};

// "AAAA-MM-JJ HH:mm:ss"
const tunisDateTime = (date = new Date()) => `${tunisDate(date)} ${tunisTime(date)}`;

// Relit une valeur DATETIME MySQL ("AAAA-MM-JJ HH:mm:ss", renvoyée en chaîne
// grâce à dateStrings) enregistrée en heure de Tunisie, et renvoie l'instant
// correspondant. `new Date("AAAA-MM-JJ HH:mm:ss")` seul serait interprété dans
// le fuseau du serveur, ce qui décalerait le résultat.
const parseTunisDateTime = (value) => {
  if (!value) return null;
  const iso = String(value).trim().replace(" ", "T").slice(0, 19);
  const date = new Date(`${iso}${TUNIS_UTC_OFFSET}`);
  return Number.isNaN(date.getTime()) ? null : date;
};

module.exports = {
  TUNIS_TZ,
  TUNIS_UTC_OFFSET,
  tunisDate,
  tunisTime,
  tunisDateTime,
  parseTunisDateTime,
};
