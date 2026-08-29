# ⚙️ FitNova — Backend

API REST de l'application **FitNova**, développée en **Node.js + Express**, avec une base de données **MySQL**.

> 🔗 Ce module est consommé par l'application décrite dans [`../frontend/README.md`](../frontend/README.md). Voir aussi la [vue d'ensemble du projet](../README.md).

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
| Base de données | MySQL ≥ 8 (via `mysql2/promise`, pool de connexions) |
| Auth | JSON Web Tokens (`jsonwebtoken`), Google Auth (`google-auth-library`) |
| Hash mots de passe | `bcryptjs` |
| Validation | `express-validator` |
| Upload fichiers | `multer` |
| E-mail | `nodemailer` |
| IA | `@google/genai` (Google Gemini) — chatbot & analyse de repas par photo |
| Dev | `nodemon` |

---

## ⚙️ Installation

```bash
cd backend
npm install
```

Créer et configurer le fichier `.env` (voir section suivante), s'assurer que MySQL est démarré et que la base de données cible existe, puis :

```bash
npm run dev     # avec rechargement automatique (nodemon)
# ou
npm start        # démarrage simple (production)
```

Le serveur démarre par défaut sur `http://localhost:5000` et répond sur `GET /` avec :
```json
{ "message": "API FitNova opérationnelle" }
```

---

## 🔑 Configuration (.env)

```env
# =====================
# SERVER
# =====================
PORT=5000
NODE_ENV=development

# =====================
# DATABASE
# =====================
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=fitnova
DB_PORT=3306

# =====================
# JWT
# =====================
JWT_SECRET=une_chaine_secrete_longue_et_aleatoire
JWT_EXPIRES_IN=7d

# =====================
# EMAIL (Nodemailer)
# =====================
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=xxxx
SMTP_PASSWORD=xxxx
SMTP_FROM="FitNova <no-reply@fitnova.app>"

# =====================
# OTP
# =====================
OTP_LENGTH=6
OTP_EXPIRES_MINUTES=10

# =====================
# GOOGLE LOGIN
# =====================
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_ID_ANDROID=xxxx.apps.googleusercontent.com

# =====================
# UPLOADS
# =====================
UPLOAD_PATH=uploads

# =====================
# Chatbot santé/fitness
# =====================
GEMINI_API_KEY=xxxx

# =====================
# CLIENT
# =====================
CLIENT_URL=http://localhost:8081
```

| Variable | Description |
|---|---|
| `PORT` | Port d'écoute du serveur Express |
| `NODE_ENV` | `development` / `production` — influence l'affichage des stack traces dans les réponses d'erreur |
| `DB_HOST/USER/PASSWORD/NAME/PORT` | Connexion au pool MySQL (`config/db.js`) |
| `JWT_SECRET` / `JWT_EXPIRES_IN` | Signature et durée de validité des tokens d'authentification |
| `SMTP_*` | Configuration de l'envoi d'e-mails (OTP d'inscription et de réinitialisation) |
| `OTP_LENGTH` / `OTP_EXPIRES_MINUTES` | Longueur et durée de validité des codes OTP |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_ID_ANDROID` | Vérification des tokens Google Sign-In (Web et Android) |
| `UPLOAD_PATH` | Répertoire de stockage des fichiers uploadés |
| `GEMINI_API_KEY` | Clé de l'API Google Gemini (chatbot + analyse de repas par photo) |
| `CLIENT_URL` | URL du frontend (utilisée notamment dans les liens envoyés par e-mail) |

---

## 📜 Scripts disponibles

| Commande | Description |
|---|---|
| `npm run dev` | Démarre le serveur avec `nodemon` (rechargement automatique) |
| `npm start` | Démarre le serveur en mode standard (`node server.js`) |

---

## 🗂️ Structure du projet

```
backend/
├── server.js                    # Point d'entrée : configuration Express, montage des routes
├── config/
│   └── db.js                     # Pool de connexions MySQL (mysql2/promise)
├── controllers/                  # Logique métier par domaine
│   ├── auth.controller.js         # Inscription, connexion, OTP, Google, reset mot de passe
│   ├── user.controller.js          # Profil utilisateur connecté (getMe, updateMe, photo)
│   ├── profile.controller.js        # Profil fitness (objectifs, poids, historique)
│   ├── dashboard.controller.js       # Agrégation des données du tableau de bord
│   ├── tracking.controller.js         # Eau, pas, calories brûlées, sommeil
│   ├── meal.controller.js              # Journal de repas (CRUD + synchronisation des totaux)
│   ├── nutrition.controller.js          # Scan de repas par photo (IA)
│   ├── scanHistory.controller.js         # Historique des scans (code-barres + photo)
│   ├── reminder.controller.js             # Rappels personnalisés
│   └── chatbot.controller.js               # Conversations et messages du chatbot IA
├── models/                       # Accès aux données (requêtes SQL brutes via pool)
│   ├── user.model.js
│   ├── profile.model.js
│   ├── dailyTracking.model.js
│   ├── meal.model.js
│   ├── scanHistory.model.js
│   ├── weightBmiHistory.model.js
│   ├── reminder.model.js
│   ├── conversation.model.js
│   ├── message.model.js
│   └── otp.model.js
├── routes/                       # Définition des routes Express par domaine
│   ├── auth.routes.js
│   ├── user.routes.js
│   ├── profile.routes.js
│   ├── dashboard.routes.js
│   ├── tracking.routes.js
│   ├── meal.routes.js
│   ├── nutrition.routes.js
│   ├── reminder.routes.js
│   └── chatbot.routes.js
├── middlewares/
│   ├── auth.middleware.js         # Vérification du JWT (`protect`)
│   ├── upload.middleware.js        # Configuration Multer (upload d'images)
│   └── error.middleware.js          # Gestion centralisée des erreurs (404 + 500)
├── services/                     # Logique métier réutilisable / intégrations externes
│   ├── bmi.service.js             # Calcul de l'IMC
│   ├── caloriegoal.service.js      # Calcul de l'objectif calorique personnalisé
│   ├── email.service.js             # Envoi d'e-mails (Nodemailer)
│   ├── otp.service.js                # Génération / validation des codes OTP
│   ├── mealScanner.service.js         # Analyse de repas par photo via Gemini
│   └── chatbot.service.js              # Génération de réponses du chatbot via Gemini
├── utils/
│   ├── jwt.js                     # Signature / vérification des tokens JWT
│   ├── generateOtp.js              # Génération de codes OTP aléatoires
│   └── verifyGoogleToken.js         # Vérification des tokens Google Sign-In
└── uploads/                      # Fichiers uploadés (photos de profil, photos de repas)
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
    │
    ▼
models/*.js             → Requêtes SQL (pool `mysql2/promise`)
    │
    ▼
MySQL Database
```

Cette séparation permet de garder les contrôleurs légers et de réutiliser la logique métier (ex. `caloriegoal.service.js` peut être appelé aussi bien lors de la création de profil que lors d'une mise à jour du poids).

---

## 🛡️ Middlewares

| Middleware | Rôle |
|---|---|
| `auth.middleware.js` (`protect`) | Vérifie la présence et la validité du header `Authorization: Bearer <token>`, décode le JWT et injecte `req.user` (contenant `id`) dans la requête. Renvoie `401` si absent/invalide. |
| `upload.middleware.js` | Configuration Multer : stockage disque dans `/uploads`, nom de fichier unique (`{userId}-{timestamp}.ext`), filtre sur les types d'image (`jpeg`, `jpg`, `png`, `webp`), limite de **5 Mo**. |
| `error.middleware.js` | `notFound` intercepte les routes inexistantes (404) ; `errorHandler` centralise toutes les erreurs, masque la stack trace en production (`NODE_ENV=production`). |

---

## 🔌 Endpoints de l'API

Toutes les routes protégées nécessitent un header `Authorization: Bearer <token>`.

### 🔐 `/api/auth` — Authentification
| Méthode | Route | Description |
|---|---|---|
| POST | `/register` | Inscription (envoi d'un OTP par e-mail) |
| POST | `/verify-email` | Vérification du compte via OTP |
| POST | `/resend-otp` | Renvoi d'un nouveau code OTP |
| POST | `/login` | Connexion e-mail / mot de passe |
| POST | `/google` | Connexion via Google Sign-In |
| POST | `/forgot-password` | Démarre le flux de réinitialisation (envoi OTP) |
| POST | `/verify-reset-otp` | Vérifie le code OTP de réinitialisation |
| POST | `/reset-password` | Définit le nouveau mot de passe |

### 👤 `/api/users` — Utilisateur connecté *(protégé)*
| Méthode | Route | Description |
|---|---|---|
| GET | `/me` | Récupère les infos du compte connecté (`full_name`, `profile_photo`...) |
| PUT | `/me` | Met à jour les infos du compte |
| PUT | `/me/photo` | Met à jour la photo de profil (upload multipart) |

### 🧍 `/api/profile` — Profil fitness *(protégé)*
| Méthode | Route | Description |
|---|---|---|
| POST | `/` | Crée le profil fitness (âge, taille, poids, objectifs...) |
| GET | `/` | Récupère le profil fitness |
| PUT | `/` | Met à jour le profil fitness |
| GET | `/weight-history` | Historique de poids/IMC pour le graphique de progression |

### 📊 `/api/dashboard` *(protégé)*
| Méthode | Route | Description |
|---|---|---|
| GET | `/` | Agrégat complet pour l'écran d'accueil (calories, macros, eau, sommeil, pas...) |

### 💧 `/api/tracking` — Suivi quotidien *(protégé)*
| Méthode | Route | Description |
|---|---|---|
| GET | `/` | Récupère le suivi du jour (ou d'une date donnée) |
| POST | `/water` | Ajoute/retire de l'eau (protection `GREATEST(..., 0)` contre les valeurs négatives) |
| POST | `/steps` | Enregistre le nombre de pas |
| POST | `/calories-burned` | Enregistre les calories brûlées |
| POST | `/sleep` | Enregistre l'heure de coucher / réveil |

### 🍽️ `/api/meals` — Journal de repas *(protégé)*
| Méthode | Route | Description |
|---|---|---|
| GET | `/` | Liste les repas enregistrés (avec filtre par date) |
| POST | `/` | Ajoute un repas (saisie manuelle, code-barres ou photo) — synchronise automatiquement les totaux journaliers |
| DELETE | `/:id` | Supprime un repas — resynchronise les totaux journaliers |

### 🥗 `/api/nutrition` — Scan & historique *(protégé)*
| Méthode | Route | Description |
|---|---|---|
| POST | `/scan-meal` | Upload d'une photo de repas → analyse IA (Gemini) → retour des macros estimées |
| GET | `/history` | Liste l'historique des scans (code-barres + photo) |
| GET | `/history/:id` | Détail d'une entrée d'historique |
| POST | `/history` | Ajoute une entrée à l'historique de scan |
| DELETE | `/history/:id` | Supprime une entrée d'historique |

### 🔔 `/api/reminders` — Rappels *(protégé)*
| Méthode | Route | Description |
|---|---|---|
| POST | `/` | Crée un rappel (fréquence, jours actifs, heure) |
| GET | `/` | Liste les rappels de l'utilisateur |
| PUT | `/:id` | Met à jour un rappel |
| DELETE | `/:id` | Supprime un rappel |

### 💬 `/api/chatbot` — Assistant santé/fitness *(protégé)*
| Méthode | Route | Description |
|---|---|---|
| POST | `/conversations` | Crée une nouvelle conversation |
| GET | `/conversations` | Liste les conversations de l'utilisateur |
| PATCH | `/conversations/:id` | Renomme une conversation |
| DELETE | `/conversations/:id` | Supprime une conversation |
| GET | `/conversations/:id/messages` | Récupère les messages d'une conversation |
| POST | `/conversations/:id/messages` | Envoie un message et obtient la réponse de l'IA (Gemini) |

---

## 🗄️ Modèle de données

Tables MySQL (créées et référencées par les fichiers de `models/`) :

| Table | Modèle associé | Contenu |
|---|---|---|
| `users` | `user.model.js` | Comptes (e-mail, mot de passe hashé `bcryptjs`, Google ID, statut de vérification) |
| `profiles` | `profile.model.js` | Données de profil fitness : âge, taille, poids, sexe, niveau d'activité, objectifs (calorique, hydrique, pas) |
| `daily_tracking` | `dailyTracking.model.js` | Suivi quotidien par utilisateur/date : eau consommée, pas, calories brûlées, heures de coucher/réveil, totaux caloriques et macros (synchronisés depuis `meals`) |
| `meals` | `meal.model.js` | Repas ajoutés au journal (type de repas, source : manuel/code-barres/photo, calories, macros, date) |
| `analyzed_meal_history` | `scanHistory.model.js` | Historique des scans (photo ou code-barres) avec image, macros estimées, badge de confiance, éléments détectés, note IA |
| `weight_bmi_history` | `weightBmiHistory.model.js` | Historique chronologique du poids et de l'IMC calculé |
| `reminders` | `reminder.model.js` | Rappels utilisateur (type, fréquence, jours actifs, heure) |
| `conversations` | `conversation.model.js` | Conversations du chatbot (titre, date de création) |
| `messages` | `message.model.js` | Messages échangés dans une conversation (rôle utilisateur/IA, contenu) |
| `otp_codes` | `otp.model.js` | Codes OTP temporaires (inscription, réinitialisation), avec expiration |

**Conventions de schéma** :
- Les tables sont créées via des scripts **idempotents** (`CREATE TABLE IF NOT EXISTS`), et les évolutions de schéma (ajout de colonnes) vérifient l'existence de la colonne avant `ALTER TABLE`, afin de pouvoir être ré-exécutées sans erreur.
- Les champs cumulatifs (eau, etc.) sont mis à jour via des clauses telles que `GREATEST(field + ?, 0)` pour empêcher toute valeur négative.
- L'ajout/suppression d'un repas (`meals`) déclenche une **resynchronisation automatique** des totaux caloriques/macros du jour dans `daily_tracking`.

---

## 🔗 Services & intégrations externes

| Service | Rôle |
|---|---|
| `bmi.service.js` | Calcule l'IMC à partir du poids et de la taille |
| `caloriegoal.service.js` | Calcule l'objectif calorique journalier personnalisé (selon profil, objectif, activité) |
| `email.service.js` | Envoi d'e-mails transactionnels (codes OTP) via **Nodemailer** |
| `otp.service.js` | Génère et valide les codes OTP (durée de vie configurable via `OTP_EXPIRES_MINUTES`) |
| `mealScanner.service.js` | Envoie la photo du repas à **Google Gemini** (`@google/genai`) et interprète la réponse structurée (aliments détectés, macros estimées, niveau de confiance) |
| `chatbot.service.js` | Génère les réponses du chatbot santé/fitness via **Google Gemini**, en tenant compte de l'historique de conversation |

**Intégrations tierces consommées côté frontend mais liées au backend** :
- **OpenFoodFacts** : recherche par code-barres (consommée directement depuis le frontend, sans passer par le backend)
- **Google Sign-In** : les tokens sont vérifiés côté serveur via `utils/verifyGoogleToken.js` et `google-auth-library`

---

## 📁 Gestion des fichiers uploadés

- Les fichiers (photos de profil, photos de repas) sont stockés sur disque dans `backend/uploads/`, gérés par **Multer** (`middlewares/upload.middleware.js`).
- Le dossier est servi statiquement par Express : `app.use("/uploads", express.static(...))`.
- Chaque fichier est nommé `{userId}-{timestamp}.{extension}` pour éviter les collisions.
- Seuls les formats `jpeg`, `jpg`, `png`, `webp` sont acceptés, avec une taille maximale de **5 Mo**.

---

## 🧯 Gestion des erreurs

- `notFound` intercepte toute route non définie et retourne une erreur 404 formatée.
- `errorHandler` centralise toutes les erreurs (y compris celles levées dans les contrôleurs/services) et répond avec :
  ```json
  { "message": "...", "stack": "... (uniquement hors production)" }
  ```
- Les contrôleurs utilisent `express-validator` pour valider les entrées avant traitement.

---

## 🔒 Sécurité

- **Mots de passe** hashés avec `bcryptjs` avant stockage — jamais en clair.
- **JWT** signés avec `JWT_SECRET`, durée de vie configurable (`JWT_EXPIRES_IN`).
- **Toutes les routes sensibles** protégées par le middleware `protect`, qui rejette toute requête sans token valide.
- **Validation des entrées** via `express-validator` sur les endpoints critiques (inscription, connexion...).
- **CORS** activé globalement (`cors`) — à restreindre à l'origine du frontend en production.
- **Upload sécurisé** : filtrage strict des types de fichiers et limite de taille via Multer.
- Ne jamais committer le fichier `.env` réel — seul un `.env.example` sans valeurs sensibles doit être versionné.

---

## 📐 Conventions de code

- **Séparation stricte des responsabilités** : `routes` (définition d'endpoints) → `controllers` (orchestration) → `services` (logique métier réutilisable) → `models` (accès SQL).
- **Requêtes SQL explicites** via `pool.query(...)` (pas d'ORM) — favorise la lisibilité et le contrôle fin des performances.
- **Routes conservées même si un wrapper frontend est supprimé** : la stabilité de l'API prime sur l'usage ponctuel côté client.
- **Migrations idempotentes** pour toute évolution de schéma.
- **Audit complet du code existant** (modèles, contrôleurs, routes, services) avant toute nouvelle implémentation.

---

## 🩺 Dépannage

| Problème | Solution |
|---|---|
| `Erreur de connexion à MySQL` au démarrage | Vérifier `DB_HOST/USER/PASSWORD/NAME/PORT` dans `.env` et que le service MySQL est démarré |
| `401 Non autorisé, token manquant` | Vérifier que le frontend envoie bien le header `Authorization: Bearer <token>` |
| `401 Token invalide ou expiré` | Le JWT a expiré (`JWT_EXPIRES_IN`) ou `JWT_SECRET` a changé — reconnexion nécessaire |
| Upload de photo échoue | Vérifier le type de fichier (jpeg/jpg/png/webp) et sa taille (< 5 Mo) |
| OTP jamais reçu par e-mail | Vérifier la configuration `SMTP_*` et les logs de `email.service.js` |
| Erreur lors du scan de repas par photo | Vérifier que `GEMINI_API_KEY` est valide et que le quota de l'API n'est pas dépassé |
