# 🏋️‍♀️ FitNova

**FitNova** est une application mobile de fitness et de nutrition complète, développée avec une architecture **full-stack moderne** :

- 📱 **Frontend** : React Native + Expo (Expo Router, TypeScript)
- ⚙️ **Backend** : Node.js + Express
- 🗄️ **Base de données** : MySQL

L'application permet à l'utilisateur de suivre son alimentation, son hydratation, son sommeil, son poids/IMC, ses pas, et de dialoguer avec un chatbot santé/fitness alimenté par l'IA — le tout depuis un tableau de bord unique et personnalisé.

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

---

## 🎯 Vision du projet

FitNova a pour objectif de proposer une expérience de suivi de fitness **simple, rapide et intelligente**, en évitant la friction habituelle de la saisie manuelle de données nutritionnelles. Trois piliers guident les choix produit :

1. **Zéro friction de saisie** : scan de code-barres (OpenFoodFacts) et analyse de repas par photo (IA) plutôt que la recherche manuelle fastidieuse d'aliments.
2. **Vue consolidée** : une page d'accueil unique qui centralise calories, macros, eau, sommeil et repas du jour, sans naviguer entre plusieurs écrans.
3. **Accompagnement intelligent** : un chatbot santé/fitness contextualisé aide l'utilisateur à interpréter ses données et à rester motivé.

---

## ✨ Aperçu des fonctionnalités

### 🔐 Authentification & compte
- Inscription / connexion par e-mail + mot de passe, avec vérification par **OTP** envoyé par e-mail
- Connexion via **Google Sign-In**
- Réinitialisation de mot de passe (OTP également)
- Onboarding + assistant de complétion de profil (wizard multi-étapes)

### 🏠 Accueil (Home)
- Salutation dynamique selon l'heure ("Bonjour" / "Bonsoir") avec prénom et photo de profil
- Résumé calorique et macros du jour (glucides / protéines / lipides)
- Suivi de l'hydratation (ajout/retrait, protection contre les valeurs négatives)
- Suivi du sommeil (heure de coucher / réveil, calcul automatique de la durée)
- Suivi des pas (pedometer)
- Journal de repas consolidé : ajout manuel, scan code-barres, scan photo IA
- Bande hebdomadaire (WeekStrip) pour naviguer entre les jours

### 🍎 Nutrition
- Recherche d'aliments et de recettes (TheMealDB)
- Scanner de code-barres avec récupération des données OpenFoodFacts + Nutri-Score
- Scanner de repas par photo, analysé par IA (Gemini)
- Historique complet des scans (code-barres + photo), avec écran de détail (image, macros, badge de confiance, éléments détectés, note IA)
- Détails aliment / repas avant ajout au journal

### 💬 Chatbot santé/fitness
- Conversations multiples avec historique
- Renommage et suppression de conversations
- Réponses contextualisées grâce à l'IA (Google Gemini)

### 👤 Profil & suivi long terme
- Profil complet (âge, taille, poids, objectifs, niveau d'activité, objectif calorique, objectif hydrique, objectif de pas...)
- Historique poids/IMC avec graphique d'évolution
- Calendrier de statistiques journalières
- Édition de profil et de photo

### 🔔 Rappels
- Création de rappels personnalisés (fréquence, jours actifs, heure)
- Notifications locales (Expo Notifications)

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

- Le **frontend** communique exclusivement via une API REST (client Axios centralisé) sécurisée par **JWT**.
- Le **backend** expose des routes protégées par middleware `protect`, orchestre la logique métier (contrôleurs), la persistance (modèles → MySQL), et l'intégration de services externes (Gemini pour l'IA, Nodemailer pour les e-mails, Google Auth pour le SSO).
- Les fichiers uploadés (photos de profil, photos de repas scannées) sont stockés côté serveur et servis statiquement via `/uploads`.

---

## 📁 Structure du dépôt

```
FitNova/
├── frontend/                  # Application mobile React Native / Expo
│   ├── src/
│   │   ├── app/                # Écrans (Expo Router — routing par fichiers)
│   │   ├── components/         # Composants réutilisables (home, nutrition, profile, chatbot, settings)
│   │   ├── services/           # Clients API (Axios) par domaine
│   │   ├── hooks/               # Hooks métier (auth, profil, pas, debounce...)
│   │   ├── types/                # Types TypeScript partagés
│   │   ├── constants/            # Couleurs, étapes du wizard profil...
│   │   └── utils/                 # Fonctions utilitaires (formatage, storage, validation...)
│   ├── assets/                 # Images, icônes, polices
│   ├── android/                 # Projet natif Android (généré par Expo)
│   └── README.md                 # 📄 Documentation détaillée frontend
│
├── backend/                    # API REST Node.js / Express
│   ├── controllers/             # Logique métier par domaine
│   ├── models/                   # Accès aux données (requêtes MySQL)
│   ├── routes/                    # Définition des endpoints REST
│   ├── middlewares/               # Auth (JWT), upload (Multer), gestion d'erreurs
│   ├── services/                   # Services métier (BMI, objectifs caloriques, e-mail, OTP, scanner IA, chatbot)
│   ├── utils/                       # Utilitaires (JWT, OTP, vérification Google)
│   ├── config/                       # Configuration base de données
│   ├── uploads/                       # Fichiers uploadés (photos)
│   ├── server.js                       # Point d'entrée de l'API
│   └── README.md                        # 📄 Documentation détaillée backend
│
└── README.md                    # 📄 Ce fichier — vue d'ensemble du projet
```

---

## 🛠️ Stack technique

| Domaine | Technologies |
|---|---|
| **Frontend mobile** | React Native 0.85, Expo SDK 56, Expo Router, TypeScript |
| **Navigation** | Expo Router (routing par fichiers), React Navigation |
| **State & formulaires** | React Hooks, Formik + Yup |
| **UI native** | react-native-reanimated, react-native-svg, expo-glass-effect, expo-linear-gradient |
| **Capteurs & natif** | expo-camera, expo-sensors (podomètre), expo-image-picker, react-native-health-connect |
| **Auth** | JWT, Google Sign-In (`@react-native-google-signin`, `google-auth-library`) |
| **Backend** | Node.js, Express 5 |
| **Base de données** | MySQL (via `mysql2/promise`, pool de connexions) |
| **IA** | Google Gemini (`@google/genai`) — chatbot & analyse de repas par photo |
| **Données nutritionnelles** | OpenFoodFacts (code-barres), TheMealDB (recettes) |
| **Sécurité** | bcryptjs (hash mots de passe), express-validator, JWT |
| **E-mail** | Nodemailer (envoi des OTP) |
| **Upload fichiers** | Multer |

---

## 🗄️ Modèle de données

Tables principales de la base MySQL :

| Table | Rôle |
|---|---|
| `users` | Comptes utilisateurs (identifiants, e-mail, mot de passe hashé, Google ID) |
| `profiles` | Données de profil (âge, taille, poids, objectifs, niveau d'activité...) |
| `daily_tracking` | Suivi quotidien : calories, macros, eau, sommeil, pas |
| `meals` | Journal des repas ajoutés par l'utilisateur (manuel, code-barres, photo) |
| `analyzed_meal_history` | Historique des scans (code-barres et photo) avec résultats d'analyse |
| `weight_bmi_history` | Historique de poids et d'IMC pour le suivi de progression |
| `reminders` | Rappels personnalisés (hydratation, repas, activité...) |
| `conversations` / `messages` | Conversations et messages du chatbot santé/fitness |
| `otp_codes` | Codes OTP temporaires (vérification e-mail, réinitialisation mot de passe) |

> Le détail des colonnes, contraintes et migrations est documenté dans le [README backend](./backend/README.md#-modèle-de-données).

---

## 🚀 Démarrage rapide

### Prérequis
- Node.js ≥ 18
- MySQL ≥ 8
- Expo CLI (`npm install -g expo-cli` ou usage via `npx`)
- Un appareil physique avec **Expo Go**, ou un émulateur Android/iOS

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
2. Vérification du code (`/api/auth/verify-email`) → le compte est activé.
3. Connexion (`/api/auth/login` ou `/api/auth/google`) → un **JWT** est renvoyé et stocké côté client (AsyncStorage).
4. Chaque requête protégée envoie le JWT en en-tête `Authorization: Bearer <token>`, vérifié par le middleware `protect` qui injecte `req.user.id`.
5. Au premier lancement post-inscription, l'utilisateur est redirigé vers le **wizard de complétion de profil** (`complete-profile.tsx`) avant d'accéder à l'application.

---

## 📐 Conventions & bonnes pratiques

- **Architecture en couches côté backend** : `routes → controllers → models → MySQL`, avec `services/` pour la logique métier réutilisable (calcul BMI, objectifs caloriques, OTP, e-mail, scanner IA, chatbot).
- **Client API centralisé côté frontend** : une seule instance Axios (`services/api.ts`) avec intercepteurs, complétée par des services dédiés par domaine (`meals.service.ts`, `tracking.service.ts`, `profile.service.ts`...).
- **Composants réutilisables** : `ScreenHeader`, `NutriScoreBadge`, `EmptyState`, etc., partagés entre les écrans nutrition/scanner.
- **Sécurité des données numériques** : les champs cumulés (eau, calories...) utilisent des clauses SQL type `GREATEST(field + ?, 0)` pour empêcher les valeurs négatives.
- **Migrations idempotentes** : les scripts de modification de schéma peuvent être ré-exécutés sans erreur (`CREATE TABLE IF NOT EXISTS`, vérification de colonnes existantes avant `ALTER TABLE`).
- **Audit avant implémentation** : toute nouvelle fonctionnalité commence par un audit complet du code existant (modèles, contrôleurs, routes, services, types, composants) avant modification.

---

## 🗺️ Feuille de route

- [x] Authentification complète (e-mail/OTP + Google)
- [x] Suivi eau, sommeil, pas, poids/IMC
- [x] Scanner code-barres (OpenFoodFacts) + Nutri-Score
- [x] Scanner de repas par photo (IA)
- [x] Historique des scans avec écran de détail
- [x] Journal de repas consolidé sur l'écran d'accueil
- [x] Chatbot santé/fitness avec historique de conversations
- [x] Rappels personnalisés
- [ ] Statistiques et rapports hebdomadaires/mensuels avancés
- [ ] Partage social / défis entre utilisateurs
- [ ] Mode hors-ligne avec synchronisation différée

---

## 📚 Documentation détaillée

- 📱 [`frontend/README.md`](./frontend/README.md) — installation, architecture des écrans, composants, services API, conventions React Native/Expo
- ⚙️ [`backend/README.md`](./backend/README.md) — endpoints de l'API, modèles de données, middlewares, intégrations externes, déploiement

---

## 👩‍💻 Auteure

Projet développé par **Ines Jaziri** dans le cadre du développement de l'application mobile **FitNova**.
