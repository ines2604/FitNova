// Les médias du dataset (vignette .jpg et GIF animé) sont stockés en base sous
// forme de chemins relatifs, comme dans exercises.json
// (ex. "images/0001-2gPfomN.jpg", "videos/0001-2gPfomN.gif").
//
// Ce helper les transforme en URL absolues avant de les envoyer au frontend.
// Par défaut on pointe vers le dépôt GitHub du dataset ; pour héberger les
// médias toi-même (recommandé en production, voir NOTICE.md du dataset),
// définis EXERCISE_MEDIA_BASE_URL dans backend/.env, par exemple :
//   EXERCISE_MEDIA_BASE_URL=https://mon-serveur.exemple/exercise-media
// (le dossier doit contenir les sous-dossiers images/ et videos/ du dataset)
const DEFAULT_MEDIA_BASE_URL =
  "https://raw.githubusercontent.com/shahanbutt/exercises-dataset/main";

const getMediaBaseUrl = () =>
  (process.env.EXERCISE_MEDIA_BASE_URL || DEFAULT_MEDIA_BASE_URL).replace(/\/+$/, "");

const mediaUrl = (relativePath) => {
  if (!relativePath) return null;
  if (/^https?:\/\//i.test(relativePath)) return relativePath;
  return `${getMediaBaseUrl()}/${String(relativePath).replace(/^\/+/, "")}`;
};

module.exports = { mediaUrl };
