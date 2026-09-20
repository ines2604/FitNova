# ⚙️ FitNova — Backend

API REST de l'application **FitNova**, développée en **Node.js + Express**, avec une base de données **MySQL**.

> 🔗 Voir la [vue d'ensemble du projet](../README.md).

---

## 📖 Table des matières

- [Stack & prérequis](#-stack--prérequis)
- [Installation](#-installation)
- [Configuration (.env)](#-configuration-env)
- [Scripts disponibles](#-scripts-disponibles)
- [Structure du projet](#-structure-du-projet)
- [Architecture en couches](#-architecture-en-couches)
- [Middlewares](#-middlewares)
- [Endpoints de l'API](#-endpoints-de-lapi)
- [Modèle de données](#-modèle-de-données)
- [Services & intégrations externes](#-services--intégrations-externes)
- [Fuseau horaire](#-fuseau-horaire)
- [Gestion des fichiers uploadés](#-gestion-des-fichiers-uploadés)
- [Gestion des erreurs](#-gestion-des-erreurs)
- [Sécurité](#-sécurité)
- [Conventions de code](#-conventions-de-code)
- [Dépannage](#-dépannage)

---

## 🧰 Stack & prérequis

| Élément | Version / Outil |
|---|---|
| Runtime | Node.js ≥ 18 |
| Framework | Express 5 |
| Base de données | MySQL ≥ 8 (ou MariaDB), via `mysql2/promise` (pool de 10 connexions) |
| Auth | JSON Web Tokens (`jsonwebtoken`), Google Auth (`google-auth-library`) |
| Hash mots de passe | `bcryptjs` |
| Upload fichiers | `multer` |
| E-mail | `nodemailer` |
| IA | `@google/genai` (Google Gemini) — chatbot, analyse de repas par photo, génération de séances |
| Configuration | `dotenv`, `cors` |
| Dev | `nodemon` |

> ℹ️ `express-validator` est listé dans les dépendances mais n'est utilisé nulle part dans le code : la validation des entrées est faite à la main dans les contrôleurs.

---

## ⚙️ Installation

```bash
cd backend
npm install
```

Créer et configurer le fichier `.env` (voir section suivante), s'assurer que MySQL est démarré et que la base de données cible existe, puis créer les tables « manuelles » (voir [Modèle de données](#-modèle-de-données)). Ensuite :

```bash
npm run dev     # avec rechargement automatique (nodemon)
# ou
npm start       # démarrage simple (production)
```

Importer le catalogue d'exercices (une seule fois, l'opération est idempotente) :

```bash
node scripts/importExercises.js                    # télécharge exercises.json depuis GitHub
node scripts/importExercises.js ./exercises.json   # ou utilise un fichier local
```

Le serveur démarre par défaut sur `http://localhost:5000` et répond sur `GET /` avec :
```json
{ "message": "API FitNova opérationnelle" }
```

---

## 🔑 Configuration (.env)

```env
# SERVER
PORT=5000
NODE_ENV=development

# DATABASE
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=fitnova
DB_PORT=3306

# JWT
JWT_SECRET=une_chaine_secrete_longue_et_aleatoire
JWT_EXPIRES_IN=7d

# EMAIL (Nodemailer)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=xxxx
SMTP_PASSWORD=xxxx
SMTP_FROM="FitNova <no-reply@fitnova.app>"

# GOOGLE LOGIN
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_ID_ANDROID=xxxx.apps.googleusercontent.com

# IA (Gemini)
GEMINI_API_KEY=xxxx

# OPTIONNELLES
# GEMINI_WORKOUT_MODEL=...
# EXERCISE_MEDIA_BASE_URL=https://mon-serveur.exemple/exercise-media
```

| Variable | Description |
|---|---|
| `PORT` | Port d'écoute du serveur Express (défaut : `5000`) |
| `NODE_ENV` | Si `production`, la stack trace est masquée dans les réponses d'erreur |
| `DB_HOST/USER/PASSWORD/NAME/PORT` | Connexion au pool MySQL (`config/db.js`, port par défaut `3306`) |
| `JWT_SECRET` / `JWT_EXPIRES_IN` | Signature et durée de validité des tokens (défaut de durée : `7d`) |
| `SMTP_*` | Envoi des e-mails (codes OTP d'inscription et de réinitialisation) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_ID_ANDROID` | Audiences acceptées lors de la vérification des tokens Google (Web et Android) |
| `GEMINI_API_KEY` | Clé de l'API Google Gemini. Sans clé, la génération de séances bascule sur les règles ; le chatbot et le scanner de repas, eux, échouent |
| `GEMINI_WORKOUT_MODEL` | *(optionnelle)* Modèle Gemini utilisé pour générer les séances de sport (valeur par défaut dans le code) |
| `EXERCISE_MEDIA_BASE_URL` | *(optionnelle)* Base d'hébergement des images/GIF d'exercices ; doit contenir les dossiers `images/` et `videos/` du dataset. Par défaut : dépôt GitHub du dataset |

> ℹ️ Le code ne lit **pas** `OTP_LENGTH`, `OTP_EXPIRES_MINUTES`, `UPLOAD_PATH` ni `CLIENT_URL`, même si elles peuvent apparaître dans un ancien `.env`. Le code OTP fait toujours 6 chiffres et expire après 10 minutes ; les uploads vont toujours dans `backend/uploads/` ; aucun lien vers le frontend n'est inséré dans les e-mails.

---

## 📜 Scripts disponibles

| Commande | Description |
|---|---|
| `npm run dev` | Démarre le serveur avec `nodemon` (rechargement automatique) |
| `npm start` | Démarre le serveur en mode standard (`node server.js`) |
| `node scripts/importExercises.js [fichier.json]` | Importe (ou met à jour) le catalogue d'exercices dans la table `exercises` |
| `node scripts/testWorkoutPlanner.js` | Teste le planificateur de séances sur toutes les combinaisons de scénarios, sans base de données ni IA |

---

## 🗂️ Structure du projet

```
backend/
├── server.js                       # Point d'entrée : configuration Express, montage des routes
├── config/
│   └── db.js                        # Pool MySQL (mysql2/promise), fuseau Tunisie, dates en chaînes
├── controllers/                     # Logique métier par domaine
│   ├── auth.controller.js            # Inscription, connexion, OTP, Google, reset mot de passe
│   ├── user.controller.js             # Compte connecté (getMe, updateMe, photo)
│   ├── profile.controller.js           # Profil fitness (objectifs, poids, historique)
│   ├── dashboard.controller.js          # Agrégation des N derniers jours + progression du poids
│   ├── tracking.controller.js            # Eau, pas, calories brûlées, sommeil
│   ├── meal.controller.js                 # Journal de repas
│   ├── nutrition.controller.js             # Scan de repas par photo (IA)
│   ├── scanHistory.controller.js            # Historique des scans (code-barres + photo)
│   ├── favorite.controller.js                # Favoris (aliments, recettes, exercices)
│   ├── progressPhoto.controller.js            # Photos de progression
│   ├── reminder.controller.js                  # Rappels personnalisés
│   ├── chatbot.controller.js                    # Conversations et messages du chatbot IA
│   ├── fasting.controller.js                     # Jeûne intermittent
│   ├── exercise.controller.js                     # Catalogue d'exercices
│   ├── workoutSession.controller.js                # Séances d'entraînement + génération IA
│   └── scheduledSession.controller.js               # Planning, exécution et historique des séances
├── models/                          # Accès aux données (SQL brut via le pool)
│   ├── user.model.js, otp.model.js, otpAttempt.model.js
│   ├── profile.model.js, weightBmiHistory.model.js, dailyTracking.model.js
│   ├── meal.model.js, scanHistory.model.js, favorite.model.js
│   ├── progressPhoto.model.js, reminder.model.js
│   ├── conversation.model.js, message.model.js
│   ├── fasting.model.js
│   └── exercise.model.js, workoutSession.model.js, scheduledSession.model.js
├── routes/                          # Une définition de routes par domaine (*.routes.js)
├── middlewares/
│   ├── auth.middleware.js            # Vérification du JWT (`protect`)
│   ├── upload.middleware.js           # Configuration Multer (upload d'images)
│   └── error.middleware.js             # 404 + gestionnaire d'erreurs global
├── services/                        # Logique métier réutilisable / intégrations externes
│   ├── bmi.service.js                # Calcul de l'IMC et de sa catégorie
│   ├── caloriegoal.service.js         # Objectif calorique (Mifflin-St Jeor)
│   ├── email.service.js                # Envoi d'e-mails (Nodemailer)
│   ├── otp.service.js                   # Création / validation des OTP + limitation des essais
│   ├── mealScanner.service.js            # Analyse de repas par photo (Gemini)
│   ├── chatbot.service.js                 # Réponses du chatbot (Gemini)
│   └── workoutGenerator.service.js         # Génération de séances (Gemini + repli par règles)
├── utils/
│   ├── jwt.js                        # Signature / vérification des tokens JWT
│   ├── generateOtp.js                 # Génération de codes OTP (6 chiffres, expiration)
│   ├── verifyGoogleToken.js            # Vérification des tokens Google Sign-In
│   ├── tunisTime.js                     # Date/heure courante en heure de Tunisie
│   ├── workoutPlanner.js                 # Logique pure de génération de séances (validation, règles, bornes)
│   ├── workoutCalories.js                 # Durée et calories estimées d'une séance (MET)
│   └── exerciseMedia.js                    # Transforme les chemins d'images/GIF en URL absolues
├── scripts/
│   ├── importExercises.js             # Import du catalogue d'exercices
│   └── testWorkoutPlanner.js           # Tests du planificateur de séances
└── uploads/                         # Fichiers uploadés (photos)
```

---

## 🏛️ Architecture en couches

```
Requête HTTP
    │
    ▼
routes/*.js            → Définition des endpoints, application du middleware `protect`
    │
    ▼
controllers/*.js       → Validation des entrées, orchestration, réponse HTTP
    │
    ├──▶ services/*.js  → Logique métier réutilisable (calculs, IA, e-mail, OTP...)
    │       └──▶ utils/*.js  → Fonctions pures (planificateur, calories, fuseau...)
    ▼
models/*.js             → Requêtes SQL (pool `mysql2/promise`)
    │
    ▼
MySQL Database
```

Cette séparation garde les contrôleurs légers et permet de réutiliser la logique métier (ex. `caloriegoal.service.js` sert aussi bien à la création du profil qu'à sa mise à jour).

---

## 🛡️ Middlewares

Ordre de montage dans `server.js` : `cors()` → `express.json()` → `express.urlencoded()` → fichiers statiques `/uploads` → routes → `notFound` → `errorHandler`.

| Middleware | Rôle |
|---|---|
| `auth.middleware.js` (`protect`) | Vérifie le header `Authorization: Bearer <token>`, décode le JWT (payload : `id` et `role`) et l'injecte dans `req.user`. Renvoie `401` avec « Non autorisé, token manquant » ou « Token invalide ou expiré ». |
| `upload.middleware.js` | Multer : stockage disque dans `uploads/`, nom `{userId}-{timestamp}.ext`, filtre sur `jpeg/jpg/png/webp`, limite de **5 Mo**. Doit être placé après `protect` (il lit `req.user.id`). |
| `error.middleware.js` | `notFound` crée une erreur 404 (« Route non trouvée - <url> ») ; `errorHandler` répond `{ message, stack }` avec un statut 500 par défaut, et `stack: null` si `NODE_ENV=production`. |

---

## 🔌 Endpoints de l'API

Toutes les routes, sauf `/api/auth/*`, nécessitent un header `Authorization: Bearer <token>`.

### 🔐 `/api/auth` — Authentification
| Méthode | Route | Description |
|---|---|---|
| POST | `/register` | Inscription (`fullName`, `email`, `password`) → envoie un OTP, renvoie `userId` |
| POST | `/verify-email` | Vérifie le compte (`userId`, `code`) → renvoie un token et l'utilisateur |
| POST | `/resend-otp` | Renvoie un nouveau code OTP |
| POST | `/login` | Connexion e-mail / mot de passe |
| POST | `/google` | Connexion via Google Sign-In (`idToken`, vérifié côté serveur) |
| POST | `/forgot-password` | Démarre la réinitialisation (envoi d'un OTP) |
| POST | `/verify-reset-otp` | Vérifie le code OTP de réinitialisation |
| POST | `/reset-password` | Définit le nouveau mot de passe |

Règles importantes :
- Mot de passe fort exigé à l'inscription : 8 caractères minimum, avec une majuscule, un chiffre et un caractère spécial.
- Une connexion avec un e-mail non vérifié renvoie `403` (avec `userId` et `emailVerified: false`) et déclenche l'envoi d'un nouvel OTP. Un compte suspendu renvoie `403`.
- Connexion Google : si un compte existe déjà avec le même e-mail, il est automatiquement lié au compte Google.
- Les vérifications d'OTP sont limitées à **5 essais par période de 15 minutes**, par utilisateur et par type de code ; au-delà, l'essai est refusé même avec le bon code ou après un renvoi.

### 👤 `/api/users` — Compte connecté
| Méthode | Route | Description |
|---|---|---|
| GET | `/me` | Infos du compte (`full_name`, `email`, `profile_photo`...) |
| PUT | `/me` | Met à jour le nom (`fullName`) |
| PUT | `/me/photo` | Met à jour la photo de profil (multipart, champ `photo`) |

### 🧍 `/api/profile` — Profil fitness
| Méthode | Route | Description |
|---|---|---|
| POST | `/` | Crée le profil (âge, sexe, taille, poids, niveau d'activité, objectif, objectifs d'eau et de pas). `409` s'il existe déjà. Calcule l'objectif calorique et enregistre le premier relevé de poids/IMC |
| GET | `/` | Profil + IMC + catégorie d'IMC |
| PUT | `/` | Met à jour le profil, recalcule l'objectif calorique et ajoute un relevé de poids/IMC si le poids change |
| GET | `/weight-history` | Historique de poids/IMC |

### 📊 `/api/dashboard`
| Méthode | Route | Description |
|---|---|---|
| GET | `/?days=7` | Objectifs du profil (calories, eau, pas), suivi quotidien des N derniers jours et historique de poids |

### 💧 `/api/tracking` — Suivi quotidien
| Méthode | Route | Description |
|---|---|---|
| GET | `/?date=YYYY-MM-DD` | Suivi du jour (ou de la date donnée) |
| POST | `/water` | Ajoute/retire de l'eau (`amountMl`, `date?`) — jamais négatif |
| POST | `/steps` | Enregistre les pas (`steps`, `date?`) |
| POST | `/calories-burned` | Enregistre les calories d'activité (`calories`, `date?`) ; le total renvoyé inclut les calories des séances de sport |
| POST | `/sleep` | Enregistre le sommeil (`bedtime`, `wakeTime`, `date?`) ; la durée est calculée |

### 🍽️ `/api/meals` — Journal de repas
| Méthode | Route | Description |
|---|---|---|
| GET | `/?date=YYYY-MM-DD` | Repas du jour (ou de la date donnée) |
| POST | `/` | Ajoute un repas : `mealType` (`breakfast`, `lunch`, `dinner`, `snack`), `name`, `calories` requis ; `protein`, `carbs`, `fat`, `imageUrl`, `source` (`manual`, `barcode`, `photo`), `barcode`, `date` optionnels. Incrémente `calories_consumed` du jour |
| DELETE | `/:id` | Supprime un repas et retire ses calories du total du jour |

### 🥗 `/api/nutrition` — Scan & historique
| Méthode | Route | Description |
|---|---|---|
| POST | `/scan-meal` | Photo d'un repas (multipart, champ `photo`) → analyse Gemini → macros estimées ; l'analyse est enregistrée automatiquement dans l'historique (`scanHistoryId` renvoyé) |
| GET | `/history?type=photo\|barcode` | Historique des scans (filtre optionnel) |
| GET | `/history/:id` | Détail d'une entrée |
| POST | `/history` | Enregistre une analyse (utilisé par le scanner de code-barres, dont la recherche produit se fait côté client) |
| DELETE | `/history/:id` | Supprime une entrée |

### ⭐ `/api/favorites` — Favoris
| Méthode | Route | Description |
|---|---|---|
| GET | `/?type=food\|recipe\|exercise` | Liste des favoris (filtre optionnel) |
| GET | `/status?itemType=&refId=` | Indique si un élément est en favori |
| POST | `/` | Ajoute un favori (`itemType` : `food`, `recipe` ou `exercise`) |
| DELETE | `/:id` | Retire un favori |

### 📸 `/api/progress-photos` — Photos de progression
| Méthode | Route | Description |
|---|---|---|
| GET | `/` | Historique, de la plus récente à la plus ancienne |
| POST | `/` | Ajoute une photo (multipart, champ `photo`, avec `weightKg?` et `photoDate` au format `AAAA-MM-JJ`) |
| DELETE | `/:id` | Supprime une photo |

### 🔔 `/api/reminders` — Rappels
| Méthode | Route | Description |
|---|---|---|
| POST | `/` | Crée un rappel : `type` (`water`, `activity`, `sleep`), `time`, `activeDays`, `frequency` (`once`, `every_30_min`, `every_hour`, `every_2_hours`), `endTime` |
| GET | `/` | Liste les rappels |
| PUT | `/:id` | Met à jour un rappel (`time`, `activeDays`, `isActive`, `frequency`, `endTime`) |
| DELETE | `/:id` | Supprime un rappel |

### 💬 `/api/chatbot` — Assistant santé/fitness
| Méthode | Route | Description |
|---|---|---|
| POST | `/conversations` | Crée une conversation (`title?`) |
| GET | `/conversations` | Liste les conversations |
| PATCH | `/conversations/:id` | Renomme une conversation |
| DELETE | `/conversations/:id` | Supprime une conversation |
| GET | `/conversations/:id/messages` | Messages d'une conversation |
| POST | `/conversations/:id/messages` | Envoie un message (`content`) : enregistre le message, interroge Gemini avec tout l'historique et renvoie la réponse du bot |

### ⏳ `/api/fasting` — Jeûne
| Méthode | Route | Description |
|---|---|---|
| GET | `/current` | Jeûne en cours ou prochain jeûne planifié |
| GET | `/?month=YYYY-MM` | Jeûnes du mois (calendrier) |
| GET | `/stats?days=90` | Heures de jeûne réellement tenues par jour |
| POST | `/plan` | Planifie un jeûne : `planDate`, `startTime` (`HH:mm`, dans le futur), `durationHours` |
| POST | `/start` | Démarre un jeûne : `{ id }` pour un jeûne planifié, ou `{ durationHours }` pour un démarrage immédiat |
| POST | `/:id/end` | Termine un jeûne actif |
| POST | `/:id/cancel` | Annule un jeûne planifié ou actif |

Statuts : `planned`, `active`, `completed`, `cancelled`. Un seul jeûne planifié ou en cours par jour (`409` sinon).

### 💪 `/api/exercises` — Catalogue d'exercices
| Méthode | Route | Description |
|---|---|---|
| GET | `/?q=&bodyPart=&equipment=&page=&limit=` | Liste paginée (20 par page par défaut, 100 maximum), triée par nom |
| GET | `/filters` | Valeurs disponibles pour les filtres (`bodyParts`, `equipments`) |
| GET | `/favorites` | Exercices favoris de l'utilisateur, avec leurs détails |
| GET | `/:id?lang=fr` | Fiche détaillée ; instructions dans la langue demandée (`fr` par défaut, `all` pour toutes) |

### 🏋️ `/api/sessions` — Séances d'entraînement
| Méthode | Route | Description |
|---|---|---|
| POST | `/` | Crée une séance : `name` et au moins un exercice `{ exerciseId, sets, durationSeconds, restSeconds }` |
| POST | `/generate` | Génère une séance en aperçu (rien n'est enregistré) : `level`, `location`, `durationMinutes` (10 à 90), `goal?` (défaut : objectif du profil), `focus?`, `useAi?` |
| GET | `/` | Liste les séances de l'utilisateur |
| GET | `/:id` | Détail d'une séance et de ses exercices |
| PUT | `/:id` | Renomme une séance |
| POST | `/:id/exercises` | Ajoute un exercice |
| PUT | `/:id/exercises` | Remplace tous les exercices |
| PATCH | `/:id/exercises/:sessionExerciseId` | Modifie un exercice (séries, durée, repos) |
| DELETE | `/:id/exercises/:sessionExerciseId` | Retire un exercice |
| PUT | `/:id/reorder` | Réordonne les exercices (`order` : liste d'identifiants) |

La génération prend `goal` ∈ `weight_loss`, `muscle_gain`, `maintenance` ; `level` ∈ `beginner`, `intermediate`, `advanced` ; `location` ∈ `home_bodyweight`, `home_equipment`, `gym` ; `focus` ∈ `full_body`, `upper_body`, `lower_body`, `core`. La réponse indique sa provenance (`source` : `ai` ou `rules`).

### 🗓️ `/api/calendar` — Planning et exécution des séances
| Méthode | Route | Description |
|---|---|---|
| POST | `/` | Planifie une séance : `sessionId`, `date`, `time` (`409` si le créneau est déjà pris) |
| POST | `/start-now` | Démarre immédiatement une séance (`sessionId`) |
| GET | `/?from=&to=` | Séances planifiées sur une période |
| GET | `/history?from=&to=&status=` | Historique des séances |
| GET | `/stats?days=370` | Minutes d'exercice par jour |
| GET | `/:id` | Détail d'une séance planifiée |
| PATCH | `/:id/start` · `/pause` · `/cancel` · `/finish` | Change l'état de la séance (`409` si la transition est impossible) |
| DELETE | `/:id` | Supprime une séance planifiée |

Statuts : `planned`, `in_progress`, `paused`, `completed`, `cancelled`, `missed`. Une séance non démarrée dont l'heure est passée, ou restée « en cours / en pause » un jour antérieur, est annulée automatiquement. À la fin ou à l'annulation, la durée réelle et les calories estimées sont enregistrées.

---

## 🗄️ Modèle de données

Il n'y a **pas d'outil de migration** et **pas de script SQL** dans le dépôt. Deux cas coexistent :

- **Tables automatiques** : créées (et migrées) au premier accès par la fonction `ensureTable()` du modèle (`CREATE TABLE IF NOT EXISTS`).
- **Tables manuelles** : à créer à l'avance dans la base ; le code ne les crée pas.

| Table | Modèle associé | Contenu | Création |
|---|---|---|---|
| `users` | `user.model.js` | Comptes : nom, e-mail, mot de passe hashé, `google_id`, `profile_photo`, `email_verified`, `role`, `status` | Manuelle |
| `profiles` | `profile.model.js` | Âge, sexe, taille, poids, niveau d'activité, objectif, objectifs calorique / eau / pas | Manuelle |
| `daily_tracking` | `dailyTracking.model.js` | Une ligne par utilisateur et par date : eau (ml), pas, calories brûlées, calories consommées, coucher/réveil, durée de sommeil | Manuelle |
| `weight_bmi_history` | `weightBmiHistory.model.js` | Historique du poids, de l'IMC et de sa catégorie | Manuelle |
| `analyzed_meal_history` | `scanHistory.model.js` | Scans photo/code-barres : image, macros, Nutri-Score, confiance, détails JSON | Manuelle |
| `reminders` | `reminder.model.js` | Rappels (type, heure, fréquence, heure de fin, jours actifs, état) | Manuelle |
| `conversations` / `messages` | `conversation.model.js`, `message.model.js` | Conversations du chatbot et leurs messages (`user` / `bot`) | Manuelle |
| `otp_codes` | `otp.model.js` | Codes OTP temporaires avec expiration | Manuelle |
| `otp_attempts` | `otpAttempt.model.js` | Compteur d'essais OTP par utilisateur et par type | Automatique |
| `meals` | `meal.model.js` | Journal des repas (type, source, calories, macros, date) | Automatique |
| `favorites` | `favorite.model.js` | Favoris (`food`, `recipe`, `exercise`) | Automatique |
| `progress_photos` | `progressPhoto.model.js` | Photos de progression (image, poids, date) | Automatique |
| `fasts` | `fasting.model.js` | Jeûnes planifiés / actifs / terminés | Automatique |
| `exercises` | `exercise.model.js` | Catalogue d'exercices (rempli par `importExercises.js`), en `utf8mb4` | Automatique |
| `workout_sessions` / `session_exercises` | `workoutSession.model.js` | Séances et leurs exercices (séries, durée, repos, ordre) | Automatique |
| `scheduled_sessions` | `scheduledSession.model.js` | Séances planifiées / exécutées, avec statut, durée réelle et calories | Automatique |

**Conventions de schéma** :
- Les évolutions de schéma vérifient l'existence des colonnes avant `ALTER TABLE`, afin de pouvoir être ré-exécutées sans erreur.
- Les ids d'exercices sont des textes de 4 chiffres (`"0025"`, en `ascii_bin`) : `exercises.id` et `session_exercises.exercise_id` doivent garder le même type.
- L'ajout ou la suppression d'un repas (`meals`) met à jour `calories_consumed` dans `daily_tracking` (via `GREATEST(0, champ + ?)`, jamais négatif). Les macros ne sont **pas** copiées dans `daily_tracking` : elles restent dans `meals`.
- `daily_tracking.calories_burned` = calories d'activité (pas / Health Connect) + calories des séances de sport terminées.

---

## 🔗 Services & intégrations externes

| Service | Rôle |
|---|---|
| `bmi.service.js` | IMC = poids / taille² ; catégories `underweight`, `normal`, `overweight`, `obese` (seuils OMS) |
| `caloriegoal.service.js` | Objectif calorique : BMR de Mifflin-St Jeor × coefficient d'activité, puis ajustement selon l'objectif (−400 kcal perte de poids, +300 prise de muscle), avec un plancher de sécurité (1 500 kcal homme, 1 200 kcal femme) |
| `email.service.js` | Envoi des codes OTP via **Nodemailer** |
| `otp.service.js` | Génère un OTP à 6 chiffres valable 10 minutes (les précédents sont invalidés) et applique la limite d'essais |
| `mealScanner.service.js` | Envoie la photo à **Gemini** (vision) et renvoie aliments détectés, portions, macros, totaux, confiance (`low` / `medium` / `high`) et note |
| `chatbot.service.js` | Réponses du chatbot via **Gemini**, avec l'historique de la conversation et un prompt système limitant le domaine (nutrition, fitness, sommeil, hydratation, bien-être ; pas de diagnostic ni de prescription) |
| `workoutGenerator.service.js` | Génère une séance : Gemini ne reçoit qu'une liste réduite d'exercices et renvoie uniquement des ids + séries/durée/repos, revalidés et bornés par `utils/workoutPlanner.js`. Si l'IA est indisponible, trop lente (20 s) ou incohérente, une génération par règles prend le relais |

Les modèles Gemini du chatbot et du scanner de repas sont fixés dans le code ; seul celui de la génération de séances se configure via `GEMINI_WORKOUT_MODEL`.

**Autres intégrations** :
- **Catalogue d'exercices** : dataset [exercises-dataset](https://github.com/shahanbutt/exercises-dataset) (1 324 exercices). Les images/GIF sont référencés par des chemins relatifs et transformés en URL absolues par `utils/exerciseMedia.js`.
- **Google Sign-In** : les tokens sont vérifiés côté serveur (`utils/verifyGoogleToken.js`).
- **OpenFoodFacts** et **TheMealDB** sont appelés directement depuis le frontend, sans passer par le backend.

---

## 🕐 Fuseau horaire

Toutes les heures enregistrées sont en **heure de Tunisie (Africa/Tunis, UTC+1)**, indépendamment du fuseau du serveur Node ou MySQL :

- `config/db.js` force le fuseau de chaque connexion MySQL (`NOW()`, `CURDATE()`, colonnes `TIMESTAMP`) et renvoie les colonnes `DATE` / `DATETIME` sous forme de chaînes (`dateStrings`), pour éviter tout décalage à la sérialisation ;
- `utils/tunisTime.js` fournit la date/heure courante côté JavaScript. Il ne faut pas utiliser `toISOString()`, `toTimeString()` ou `getHours()` pour obtenir une date du jour : ils renvoient de l'UTC ou l'heure du serveur.

---

## 📁 Gestion des fichiers uploadés

- Photos de profil, de repas et de progression sont stockées dans `backend/uploads/` par **Multer** et servies statiquement via `/uploads`.
- Nom de fichier : `{userId}-{timestamp}.{extension}`.
- Formats acceptés : `jpeg`, `jpg`, `png`, `webp` ; taille maximale : **5 Mo**.
- Le dossier `uploads/` doit exister : Multer ne le crée pas.

---

## 🧯 Gestion des erreurs

- Les contrôleurs interceptent leurs propres erreurs et répondent avec un JSON `{ "message": "...", "error": "..." }` (`400` entrée invalide, `404` ressource introuvable, `409` conflit, `500` erreur serveur).
- `notFound` intercepte toute route non définie (404).
- `errorHandler` traite les erreurs transmises à `next()` — notamment celles de Multer (mauvais format, fichier trop gros), renvoyées en `500` — et répond `{ "message": "...", "stack": "..." }`, avec `stack: null` en production.

---

## 🔒 Sécurité

- **Mots de passe** hashés avec `bcryptjs` (10 tours) ; règle de complexité appliquée à l'inscription.
- **JWT** signés avec `JWT_SECRET`, durée configurable ; toutes les routes hors `/api/auth` sont protégées par `protect`.
- **Isolation des données** : les modèles filtrent par `user_id` (séances, jeûnes, favoris, photos...) ; les ressources d'un autre utilisateur ne sont pas accessibles.
- **OTP** : expiration à 10 minutes, invalidation des codes précédents et limite de 5 essais par 15 minutes.
- **Google Sign-In** : le serveur vérifie lui-même l'`idToken` et ne fait jamais confiance à des champs envoyés en clair par le client.
- **Upload** : filtrage des types de fichiers et limite de taille.
- **CORS** activé globalement sans restriction (`cors()`) : à limiter à l'origine du frontend en production.
- Ne jamais committer le fichier `.env` réel ni de clés de signature.

---

## 📐 Conventions de code

- **Séparation des responsabilités** : `routes` → `controllers` → `services` / `utils` → `models`.
- **SQL explicite** via `pool.query(...)`, sans ORM.
- **Schéma auto-géré** par les modèles (voir [Modèle de données](#-modèle-de-données)), avec des ajustements idempotents.
- **États calculés à la lecture** : il n'y a pas de tâche planifiée (cron) ; l'expiration des jeûnes et des séances non démarrées est appliquée quand l'utilisateur lit ses données.
- **IA sous contrôle** : toute sortie de Gemini destinée à être stockée est revalidée et bornée, avec un repli sans IA quand c'est possible.
- **Routes conservées même si un wrapper frontend est supprimé** : la stabilité de l'API prime sur l'usage ponctuel côté client.
- **Audit complet du code existant** avant toute nouvelle implémentation.

---

## 🩺 Dépannage

| Problème | Solution |
|---|---|
| `Erreur de connexion à MySQL` au démarrage | Vérifier `DB_*` dans `.env`, que MySQL est démarré et que la base existe |
| Erreur « table doesn't exist » sur `users`, `profiles`, `daily_tracking`… | Ces tables ne sont pas créées automatiquement : les créer manuellement |
| `401 Non autorisé, token manquant` | Le frontend n'envoie pas `Authorization: Bearer <token>` |
| `401 Token invalide ou expiré` | Le JWT a expiré ou `JWT_SECRET` a changé : reconnexion nécessaire |
| Upload de photo échoue | Vérifier le format (jpeg/jpg/png/webp), la taille (< 5 Mo) et l'existence du dossier `uploads/` |
| OTP jamais reçu | Vérifier `SMTP_*` et les logs de `email.service.js` |
| « Trop d'essais » à la saisie d'un OTP | Limite de 5 essais par 15 minutes : attendre la fin de la période |
| Erreur lors du scan de repas ou réponses du chatbot en échec | Vérifier `GEMINI_API_KEY` et le quota de l'API |
| Séance générée avec `source: "rules"` | L'IA était indisponible, trop lente ou a répondu de façon invalide : le repli par règles a été utilisé |
| Catalogue d'exercices vide | Lancer `node scripts/importExercises.js` |
| Erreur « ancien schéma » sur `exercises` ou `session_exercises` | Ces tables datent de l'ancien catalogue (wger). Le message demande d'exécuter `scripts/migrate_exercises_dataset.sql`, script **absent du dépôt** : il faut le retrouver ou migrer/recréer les tables à la main |
| `409` à la planification d'une séance ou d'un jeûne | Créneau déjà pris (séance) ou jeûne déjà planifié/en cours ce jour-là |
| Dates décalées d'un jour | Vérifier qu'aucun code n'utilise `toISOString()` pour une date du jour (voir [Fuseau horaire](#-fuseau-horaire)) |
