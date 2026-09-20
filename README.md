# 🏋️‍♀️ FitNova

**FitNova** est une application mobile de fitness et de nutrition complète, développée avec une architecture **full-stack moderne** :

- 📱 **Frontend** : React Native + Expo (Expo Router, TypeScript)
- ⚙️ **Backend** : Node.js + Express
- 🗄️ **Base de données** : MySQL

L'application permet à l'utilisateur de suivre son alimentation, son hydratation, son sommeil, ses pas, son poids/IMC, ses jeûnes et ses entraînements, de générer des séances de sport avec l'IA et de dialoguer avec un chatbot santé/fitness — le tout depuis un tableau de bord unique et personnalisé.

---

## 📖 Table des matières

- [Vision du projet](#-vision-du-projet)
- [Aperçu des fonctionnalités](#-aperçu-des-fonctionnalités)
- [Architecture générale](#-architecture-générale)
- [Structure du dépôt](#-structure-du-dépôt)
- [Stack technique](#-stack-technique)
- [Modèle de données](#-modèle-de-données)
- [Démarrage rapide](#-démarrage-rapide)
- [Variables d'environnement](#-variables-denvironnement)
- [Flux d'authentification](#-flux-dauthentification)
- [Conventions & bonnes pratiques](#-conventions--bonnes-pratiques)
- [Feuille de route](#-feuille-de-route)
- [Documentation détaillée](#-documentation-détaillée)
- [Auteure](#-auteure)

---

## 🎯 Vision du projet

FitNova a pour objectif de proposer une expérience de suivi de fitness **simple, rapide et intelligente**, en évitant la friction habituelle de la saisie manuelle de données nutritionnelles. Trois piliers guident les choix produit :

1. **Zéro friction de saisie** :  scan de code-barres (OpenFoodFacts), analyse de repas par photo (IA) et pas récupérés automatiquement depuis le capteur / Health Connect plutôt que saisis à la main.
2. **Vue consolidée** : une page d'accueil unique qui centralise calories, macros, eau, sommeil et repas du jour, sans naviguer entre plusieurs écrans.
3. **Accompagnement intelligent** : un chatbot santé/fitness et un générateur de séances de sport par IA aident l'utilisateur à progresser et à rester motivé.
4. **Suivi long terme** : graphiques d'évolution (poids, calories, pas, jeûne, durée des séances) et photos de progression.

---

## ✨ Aperçu des fonctionnalités
 
### 🔐 Authentification & compte
- Inscription / connexion par e-mail + mot de passe, avec vérification par **OTP** (code à 6 chiffres, valable 10 minutes) envoyé par e-mail
- Mot de passe fort exigé : 8 caractères minimum, avec une majuscule, un chiffre et un caractère spécial
- Limitation des essais de saisie d'OTP : 5 essais maximum par période de 15 minutes (par utilisateur et par type de code)
- Connexion via **Google Sign-In**
- Réinitialisation de mot de passe (OTP également)
- Écrans d'accueil (`welcome`), d'onboarding (`Onboarding`) et assistant de complétion de profil en plusieurs étapes (âge, sexe, taille, poids, niveau d'activité, objectif, objectif d'eau, objectif de pas)

### 🏠 Accueil (Home)
- Salutation dynamique avec prénom et photo de profil
- Résumé calorique et macros du jour (glucides / protéines / lipides)
- Suivi de l'hydratation (ajout/retrait, protection contre les valeurs négatives)
- Suivi du sommeil (heure de coucher / réveil, calcul automatique de la durée)
- Suivi des pas **sans saisie manuelle** : podomètre de l'appareil (`expo-sensors`) ou **Health Connect** sur Android, avec rattrapage automatique des 7 derniers jours et estimation des calories brûlées
- Journal de repas consolidé (petit-déjeuner, déjeuner, dîner, collation) : ajout manuel, scan code-barres, scan photo IA
- Bande hebdomadaire (WeekStrip) pour naviguer entre les jours

### 🍎 Nutrition
- Recherche d'aliments (OpenFoodFacts, avec filtres régime / catégorie) et de recettes (TheMealDB)
- Scanner de code-barres avec récupération des données OpenFoodFacts + Nutri-Score
- Scanner de repas par photo, analysé par IA (Gemini) : aliments détectés, portions, macros, niveau de confiance et note
- Historique complet des scans (code-barres + photo), avec écran de détail
- Détails aliment / repas et choix de la portion avant ajout au journal
- **Favoris** : aliments et recettes peuvent être mis en favoris et retrouvés dans des écrans dédiés

### ⏳ Jeûne
- Planification d'un jeûne (date, heure de début future, durée en heures — 16 h par défaut) 
- Suivi en direct avec anneau de progression, fin ou annulation du jeûne
- Statuts : `planned`, `active`, `completed`, `cancelled`
- Un seul jeûne planifié ou en cours par jour
- Annulation automatique des jeûnes planifiés non démarrés une fois leur fenêtre dépassée
- Calendrier mensuel avec détail par jour, statistiques d'heures de jeûne et écran de conseils
- Notifications locales au démarrage, à la fin prévue et à la complétion

### 💪 Sport
- **Catalogue d'exercices** (1 324 exercices issus du dataset [exercises-dataset](https://github.com/shahanbutt/exercises-dataset)) : filtres par partie du corps, équipement et muscle ciblé, fiche détaillée avec image/GIF et instructions
- **Séances personnalisées** : création, renommage, ajout / suppression / remplacement / réordonnancement des exercices, avec séries, durée de travail et repos par exercice
- **Générateur de séances par IA** (Gemini) selon l'objectif (perte de poids, prise de muscle, entretien), le niveau, le lieu (poids du corps à la maison, avec matériel, salle), le focus (full body, haut, bas du corps, abdos) et la durée (10 à 90 min).
- **Calendrier / planning** : planification d'une séance à une date et une heure (un seul créneau par date/heure), démarrage immédiat, écran de séance active avec pause, fin ou annulation
- Statuts : `planned`, `in_progress`, `paused`, `completed`, `cancelled`, `missed`
- Historique des séances, statistiques de durée et **calories brûlées estimées** (formule MET × poids), ajoutées au suivi quotidien
- Rappels de séance par notification locale

### 💬 Chatbot santé/fitness
- Conversations multiples avec historique
- Suppression de conversations
- Réponses contextualisées grâce à l'IA (Google Gemini), recentrées sur la nutrition, l'activité physique, le sommeil, l'hydratation et le bien-être (sans diagnostic ni prescription médicale)

### 👤 Profil & suivi long terme
- Profil complet (âge, sexe, taille, poids, objectifs, niveau d'activité, objectif calorique, objectif hydrique, objectif de pas...)
- Objectif calorique suggéré automatiquement (formule de Mifflin-St Jeor, ajustée selon l'objectif, avec seuil de sécurité minimal)
- Historique poids/IMC avec graphique d'évolution
- **Écran de statistiques** avec filtres de période : poids, calories, pas, heures de jeûne, durée des séances de sport
- Calendrier de statistiques journalières
- **Photos de progression** (avec poids et date optionnels)
- Édition de profil et de photo

### 🔔 Rappels
- Rappels personnalisés de trois types : **hydratation**, **activité** et **sommeil**
- Fréquence : heure précise, toutes les 30 min, toutes les heures ou toutes les 2 heures (avec heure de fin), sur les jours actifs choisis
- Notifications locales (Expo Notifications), resynchronisées à chaque ouverture de l'application

---

## 🏗️ Architecture générale

```
┌─────────────────────────┐        HTTPS / REST (JSON)        ┌──────────────────────────┐
│   FitNova Frontend       │ ───────────────────────────────▶ │   FitNova Backend         │
│   React Native + Expo    │ ◀─────────────────────────────── │   Node.js + Express       │
│   (Expo Router, TS)      │                                    │                          │
└─────────────────────────┘                                    └────────────┬─────────────┘
                                                                             │
                                                     ┌───────────────────────┼───────────────────────┐
                                                     ▼                       ▼                       ▼
                                              ┌─────────────┐        ┌─────────────┐         ┌──────────────┐
                                              │   MySQL     │        │  Google     │         │ OpenFoodFacts │
                                              │  Database   │        │  Gemini API │         │      API      │
                                              └─────────────┘        └─────────────┘         └──────────────┘
```

- Le **frontend** communique avec le backend via une API REST (client Axios centralisé) sécurisée par **JWT**.
- Le **backend** expose des routes protégées par le middleware `protect`, orchestre la logique métier (contrôleurs), la persistance (modèles → MySQL) et l'intégration de services externes : **Gemini** (chatbot, analyse de repas, génération de séances), **Nodemailer** (e-mails OTP) et **Google Auth** (SSO).
- Certaines API externes sont appelées **directement depuis le frontend** : **OpenFoodFacts** (recherche et code-barres) et **TheMealDB** (recettes).
- Les médias du catalogue d'exercices (images/GIF) sont chargés par défaut depuis le dépôt GitHub du dataset, ou depuis un serveur configuré via `EXERCISE_MEDIA_BASE_URL`.
- Les fichiers uploadés (photos de profil, photos de repas scannées, photos de progression) sont stockés côté serveur dans `backend/uploads` et servis statiquement via `/uploads`.

---

## 📁 Structure du dépôt
 
```
FitNova/
├── frontend/                  # Application mobile React Native / Expo
│   ├── src/
│   │   ├── app/                # Écrans (Expo Router — routing par fichiers) ; onglets dans app/(tabs)/
│   │   ├── components/         # Composants réutilisables (home, nutrition, fasting, workouts, profile, chatbot, settings)
│   │   ├── services/           # Clients API (Axios), OpenFoodFacts, TheMealDB, notifications locales
│   │   ├── hooks/              # Hooks métier (auth, Google, profil, pas, debounce...)
│   │   ├── types/              # Types TypeScript partagés
│   │   ├── constants/          # Couleurs, étapes du wizard profil...
│   │   └── utils/              # Utilitaires (formatage, storage, validation, périodes de graphiques, libellés d'exercices...)
│   ├── plugins/                # Plugin Expo (withMinSdkVersion)
│   ├── assets/                 # Images, icônes, polices
│   ├── android/                # Projet natif Android (généré par Expo)
│   ├── app.json / eas.json     # Configuration Expo / builds EAS
│   └── package.json
│
├── backend/                    # API REST Node.js / Express
│   ├── controllers/            # Logique métier par domaine
│   ├── models/                 # Accès aux données (requêtes MySQL)
│   ├── routes/                 # Définition des endpoints REST
│   ├── middlewares/            # Auth (JWT), upload (Multer), gestion d'erreurs
│   ├── services/               # BMI, objectif calorique, e-mail, OTP, chatbot, scanner de repas IA, générateur de séances IA
│   ├── utils/                  # JWT, OTP, vérification Google, fuseau Tunisie, planificateur et calories de séance, médias d'exercices
│   ├── scripts/                # importExercises.js (import du catalogue), testWorkoutPlanner.js
│   ├── config/                 # Configuration de la base de données (pool MySQL)
│   ├── uploads/                # Fichiers uploadés (photos)
│   └── server.js               # Point d'entrée de l'API
│
└── README.md                   # 📄 Ce fichier — vue d'ensemble du projet
```

---

## 🛠️ Stack technique
 
| Domaine | Technologies |
|---|---|
| **Frontend mobile** | React Native 0.85, React 19, Expo SDK 56, Expo Router, TypeScript |
| **Navigation** | Expo Router (routing par fichiers), React Navigation |
| **State & formulaires** | React Hooks, Formik + Yup |
| **UI native** | react-native-reanimated, react-native-svg, expo-glass-effect, expo-linear-gradient, expo-image, expo-video |
| **Capteurs & natif** | expo-camera, expo-sensors (podomètre), expo-image-picker, react-native-health-connect (Android), expo-notifications |
| **Auth** | JWT, Google Sign-In (`@react-native-google-signin`, `google-auth-library`) |
| **Backend** | Node.js, Express 5 |
| **Base de données** | MySQL (via `mysql2/promise`, pool de connexions) |
| **IA** | Google Gemini (`@google/genai`) — chatbot, analyse de repas par photo, génération de séances |
| **Données nutritionnelles** | OpenFoodFacts (recherche + code-barres), TheMealDB (recettes) |
| **Catalogue d'exercices** | Dataset [exercises-dataset](https://github.com/shahanbutt/exercises-dataset), importé en base |
| **Sécurité** | bcryptjs (hash mots de passe), JWT, limitation des essais OTP |
| **E-mail** | Nodemailer (envoi des OTP) |
| **Upload fichiers** | Multer (jpeg, jpg, png, webp — 5 Mo max) |
 
---

## 🗄️ Modèle de données
 
Tables de la base MySQL :
 
| Table | Rôle | Création |
|---|---|---|
| `users` | Comptes utilisateurs (identifiants, e-mail, mot de passe hashé, Google ID) | Manuelle |
| `profiles` | Données de profil (âge, sexe, taille, poids, objectifs, niveau d'activité...) | Manuelle |
| `daily_tracking` | Suivi quotidien : calories consommées/brûlées, macros, eau, sommeil, pas | Manuelle |
| `weight_bmi_history` | Historique de poids et d'IMC | Manuelle |
| `analyzed_meal_history` | Historique des scans (code-barres et photo) avec résultats d'analyse | Manuelle |
| `reminders` | Rappels personnalisés (hydratation, activité, sommeil) | Manuelle |
| `conversations` / `messages` | Conversations et messages du chatbot | Manuelle |
| `otp_codes` | Codes OTP temporaires (vérification e-mail, réinitialisation mot de passe) | Manuelle |
| `otp_attempts` | Compteur d'essais de saisie d'OTP par utilisateur et par type | Automatique |
| `meals` | Journal des repas (manuel, code-barres, photo) | Automatique |
| `favorites` | Favoris (aliments, recettes, exercices) | Automatique |
| `progress_photos` | Photos de progression | Automatique |
| `fasts` | Jeûnes planifiés / en cours / terminés | Automatique |
| `exercises` | Catalogue d'exercices (rempli par `scripts/importExercises.js`) | Automatique |
| `workout_sessions` / `session_exercises` | Séances d'entraînement et leurs exercices | Automatique |
| `scheduled_sessions` | Séances planifiées, en cours et terminées (planning + historique) | Automatique |

> Le détail des colonnes, contraintes et migrations est documenté dans le [README backend](./backend/README.md#-modèle-de-données).

---

## 🚀 Démarrage rapide

### Prérequis
- Node.js ≥ 18
- MySQL ≥ 8
- Expo CLI (`npm install -g expo-cli` ou usage via `npx`)
- Un appareil physique avec un **development build** (voir ci-dessous), ou un émulateur Android/iOS

### 1. Cloner le dépôt
```bash
git clone <url-du-repo>
cd FitNova
```

### 2. Configurer et lancer le backend
```bash
cd backend
npm install
cp .env.example .env   # puis renseigner les variables (voir README backend)
npm run dev             # démarre sur http://localhost:5000 (nodemon)
```

### 3. Configurer et lancer le frontend
```bash
cd frontend
npm install
cp .env.example .env    # renseigner EXPO_PUBLIC_API_URL et les clés Google
npm start                # ouvre l'interface Expo (Metro Bundler)
```

Scanner le QR code avec **Expo Go**, ou lancer sur émulateur :
```bash
npm run android
npm run ios
```

> 📌 Pour tester sur un appareil physique, `EXPO_PUBLIC_API_URL` doit pointer vers l'IP locale de la machine hébergeant le backend (et non `localhost`).

---

## 🔑 Variables d'environnement

Un aperçu global (le détail complet est dans les README dédiés) :

**Backend (`backend/.env`)**
```
PORT, NODE_ENV
DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT
JWT_SECRET, JWT_EXPIRES_IN
SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM
OTP_LENGTH, OTP_EXPIRES_MINUTES
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_ID_ANDROID
UPLOAD_PATH
GEMINI_API_KEY
CLIENT_URL
```

**Frontend (`frontend/.env`)**
```
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
EXPO_PUBLIC_API_URL
```

⚠️ Ne jamais committer les fichiers `.env` réels ni les clés `.jks` de signature Android — seuls des fichiers `.env.example` (sans valeurs sensibles) doivent être versionnés.

---

## 🔐 Flux d'authentification
 
1. L'utilisateur s'inscrit (`/api/auth/register`) → un OTP est envoyé par e-mail.
2. Vérification du code (`/api/auth/verify-email`, ou `/api/auth/resend-otp` pour en recevoir un nouveau) → le compte est activé.
3. Connexion (`/api/auth/login` ou `/api/auth/google`) → un **JWT** est renvoyé et stocké côté client (AsyncStorage).
4. Chaque requête protégée envoie le JWT en en-tête `Authorization: Bearer <token>`, vérifié par le middleware `protect` qui injecte `req.user.id`.
5. Au lancement, l'application choisit l'écran d'arrivée : **Onboarding** s'il n'y a pas de token, **wizard de complétion de profil** (`complete-profile.tsx`) si le profil est incomplet, sinon l'onglet **Accueil**.
6. Si le serveur répond `401` (session expirée), la session locale et les notifications programmées sont effacées, et l'utilisateur revient à l'Onboarding.
7. Mot de passe oublié : `/api/auth/forgot-password` → `/api/auth/verify-reset-otp` → `/api/auth/reset-password`.

---

## 📐 Conventions & bonnes pratiques
 
- **Architecture en couches côté backend** : `routes → controllers → models → MySQL`, avec `services/` pour la logique métier réutilisable (BMI, objectif calorique, OTP, e-mail, chatbot, scanner IA, générateur de séances) et `utils/` pour les fonctions pures (planificateur de séances, calories, fuseau horaire).
- **Client API centralisé côté frontend** : une seule instance Axios (`services/api.ts`) avec intercepteurs (ajout du JWT, normalisation des erreurs), complétée par des services dédiés par domaine (`meals.service.ts`, `tracking.service.ts`, `fasting.service.ts`, `sessions.service.ts`, `calendar.service.ts`...). Le frontend utilise l'alias d'import `@/` pour `src/`.
- **Composants réutilisables** : `ScreenHeader`, `NutriScoreBadge`, `EmptyState`, `Chip`, etc., partagés entre les écrans.
- **Fuseau horaire unique : Africa/Tunis (UTC+1)**. Toutes les dates et heures enregistrées sont en heure de Tunisie, quel que soit le fuseau du serveur : chaque connexion MySQL force son fuseau (`config/db.js`), et `utils/tunisTime.js` fournit la date/heure courante côté JavaScript. Il ne faut pas utiliser `toISOString()` pour obtenir une date du jour.
- **Sécurité des données numériques** : les champs cumulés (eau, calories...) utilisent des clauses SQL type `GREATEST(field + ?, 0)` pour empêcher les valeurs négatives.
- **Schéma auto-géré** : pas d'outil de migration séparé — chaque modèle concerné vérifie et crée sa table au premier accès, et les ajustements de schéma sont idempotents (vérification de l'existence des colonnes avant `ALTER TABLE`).
- **IA avec garde-fous** : les sorties de Gemini (séances, analyse de repas) sont validées et bornées ; la génération de séances retombe sur des règles si l'IA est indisponible, trop lente ou incohérente.
- **États calculés à la lecture** : il n'y a pas de tâche planifiée (cron) — l'expiration des jeûnes et des séances non démarrées est appliquée à la lecture des données.
- **Audit avant implémentation** : toute nouvelle fonctionnalité commence par un audit complet du code existant (modèles, contrôleurs, routes, services, types, composants) avant modification.
---

## 🗺️ Feuille de route
 
- [x] Authentification complète (e-mail/OTP + Google)
- [x] Suivi eau, sommeil, pas, poids/IMC
- [x] Scanner code-barres (OpenFoodFacts) + Nutri-Score
- [x] Scanner de repas par photo (IA)
- [x] Historique des scans avec écran de détail
- [x] Journal de repas consolidé sur l'écran d'accueil
- [x] Favoris (aliments, recettes, exercices)
- [x] Chatbot santé/fitness avec historique de conversations
- [x] Rappels personnalisés (hydratation, activité, sommeil)
- [x] Suivi du jeûne (planification, suivi en direct, calendrier, statistiques)
- [x] Module Sport (catalogue d'exercices, séances, générateur IA, planning, séance active, historique)
- [x] Photos de progression
- [x] Graphiques d'évolution avec filtres de période
- [ ] Rapports hebdomadaires/mensuels avancés
- [ ] Partage social / défis entre utilisateurs
- [ ] Mode hors-ligne avec synchronisation différée

---

## 📚 Documentation détaillée

- 📱 [`frontend/README.md`](./frontend/README.md) — installation, architecture des écrans, composants, services API, conventions React Native/Expo
- ⚙️ [`backend/README.md`](./backend/README.md) — endpoints de l'API, modèles de données, middlewares, intégrations externes, déploiement

---

## 👩‍💻 Auteure
 
Projet développé par **Ines Jaziri** dans le cadre du développement de l'application mobile **FitNova**.
