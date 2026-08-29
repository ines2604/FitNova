# 📱 FitNova — Frontend

Application mobile **React Native / Expo** de FitNova, écrite en **TypeScript** avec **Expo Router** pour un routage basé sur les fichiers.

> 🔗 Ce module consomme l'API décrite dans [`../backend/README.md`](../backend/README.md). Voir aussi la [vue d'ensemble du projet](../README.md).

---

## 📖 Table des matières

- [Stack & prérequis](#-stack--prérequis)
- [Installation](#-installation)
- [Configuration (.env)](#-configuration-env)
- [Scripts disponibles](#-scripts-disponibles)
- [Structure du projet](#-structure-du-projet)
- [Navigation (Expo Router)](#-navigation-expo-router)
- [Écrans de l'application](#-écrans-de-lapplication)
- [Composants](#-composants)
- [Couche services (API)](#-couche-services-api)
- [Hooks personnalisés](#-hooks-personnalisés)
- [Types partagés](#-types-partagés)
- [Gestion de l'authentification](#-gestion-de-lauthentification)
- [Build & déploiement (EAS)](#-build--déploiement-eas)
- [Conventions de code](#-conventions-de-code)
- [Dépannage](#-dépannage)

---

## 🧰 Stack & prérequis

| Élément | Version / Outil |
|---|---|
| React Native | 0.85.3 |
| Expo SDK | 56 |
| React | 19.2.3 |
| TypeScript | ~6.0.3 |
| Routing | Expo Router 56 (basé sur les fichiers) |
| Formulaires | Formik + Yup |
| Animations | react-native-reanimated 4, react-native-worklets |
| Icônes | @expo/vector-icons, react-native-vector-icons |
| Auth Google | @react-native-google-signin/google-signin, expo-auth-session |
| Capteurs | expo-sensors (podomètre), expo-camera, expo-image-picker |
| Santé | react-native-health-connect |

**Prérequis machine** :
- Node.js ≥ 18
- npm
- Expo CLI (via `npx expo`)
- **Expo Go** sur mobile *(pour un développement rapide)*, ou Android Studio / Xcode pour un build natif (`expo run:android` / `expo run:ios`) — nécessaire pour les modules natifs non inclus dans Expo Go (ex. `react-native-health-connect`, `expo-dev-client`).

---

## ⚙️ Installation

```bash
cd frontend
npm install
```

Puis configurer les variables d'environnement (voir section suivante) et lancer :

```bash
npm start
```

Cela ouvre le **Metro Bundler**. Depuis là :
- Scanner le QR code avec l'app **Expo Go** (Android/iOS)
- Ou appuyer sur `a` / `i` pour lancer sur émulateur Android / simulateur iOS
- Ou appuyer sur `w` pour lancer la version web (support partiel via `react-native-web`)

---

## 🔑 Configuration (.env)

Créer un fichier `.env` à la racine de `frontend/` :

```env
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
EXPO_PUBLIC_API_URL=http://192.168.1.XX:5000/api
```

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Client ID OAuth Google (type Web) — requis pour Google Sign-In |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | Client ID OAuth Google (type Android) |
| `EXPO_PUBLIC_API_URL` | URL de base de l'API backend. **Ne pas utiliser `localhost`** si test sur appareil physique — utiliser l'IP locale de la machine hébergeant le backend |

> Le préfixe `EXPO_PUBLIC_` est requis par Expo pour exposer une variable au bundle client.

---

## 📜 Scripts disponibles

| Commande | Description |
|---|---|
| `npm start` | Démarre le serveur de développement Expo (Metro) |
| `npm run android` | Build & lance l'app sur émulateur/appareil Android (build natif) |
| `npm run ios` | Build & lance l'app sur simulateur/appareil iOS (build natif) |
| `npm run web` | Lance la version web via `react-native-web` |
| `npm run lint` | Analyse statique du code (`expo lint`) |
| `npm run reset-project` | Réinitialise le projet à un état vierge (script `scripts/reset-project.js`) |

---

## 🗂️ Structure du projet

```
frontend/
├── src/
│   ├── app/                          # Écrans — routage par fichiers (Expo Router)
│   │   ├── (tabs)/                    # Groupe de routes avec barre d'onglets
│   │   │   ├── Home.tsx                # Tableau de bord principal
│   │   │   ├── nutrition.tsx            # Recherche nutrition & recettes
│   │   │   ├── chatbot.tsx               # Assistant santé/fitness
│   │   │   ├── profile.tsx                # Profil utilisateur
│   │   │   └── _layout.tsx                 # Layout de la barre d'onglets
│   │   ├── index.tsx                   # Point d'entrée / redirection initiale
│   │   ├── welcome.tsx                  # Écran de bienvenue
│   │   ├── Onboarding.tsx                # Carrousel d'onboarding
│   │   ├── login.tsx / register.tsx       # Authentification
│   │   ├── CodeOTP.tsx                     # Saisie du code OTP
│   │   ├── forgot-password.tsx              # Mot de passe oublié
│   │   ├── reset-password.tsx                # Réinitialisation
│   │   ├── complete-profile.tsx               # Wizard de complétion de profil
│   │   ├── edit-profile.tsx                    # Édition du profil
│   │   ├── settings.tsx                         # Paramètres & rappels
│   │   ├── nutrition-foods.tsx                   # Liste d'aliments
│   │   ├── nutrition-food-details.tsx             # Détail d'un aliment
│   │   ├── nutrition-meals.tsx                     # Liste de repas/recettes
│   │   ├── nutrition-meal-details.tsx               # Détail d'un repas/recette
│   │   ├── nutrition-scanner.tsx                     # Scanner code-barres
│   │   ├── nutrition-meal-scanner.tsx                 # Scanner photo (IA)
│   │   ├── nutrition-scan-details.tsx                  # Détail d'un scan historique
│   │   └── _layout.tsx                                  # Layout racine (Stack)
│   │
│   ├── components/                   # Composants réutilisables
│   │   ├── home/                      # WaterCard, SleepCard, StepsCard, MacroRing,
│   │   │                                # CalorieSummary, MealSection, AddMealSheet,
│   │   │                                # WeekStrip, TimePickerModal
│   │   ├── nutrition/                  # Chip, FoodListItem, MealListItem,
│   │   │                                # NutriScoreBadge, ScreenHeader, EmptyState
│   │   ├── profile/                     # ProfileInfoCard, ProfileProgress, WizardNav,
│   │   │                                 # pickers (Ruler/Vertical/Number), WeightProgressChart,
│   │   │                                 # DailyStatsCalendar, ChoiceOption
│   │   ├── chatbot/                      # MessageBubble, TypingIndicator,
│   │   │                                  # ConversationHistoryModal
│   │   ├── settings/                      # ReminderTimePicker, FrequencyPicker, ActiveDaysPicker
│   │   ├── AppTextInput.tsx, HomeHeader.tsx, NextButton.tsx,
│   │   └── OnboardingItem.tsx, Paginator.tsx, BottomTabBar.jsx
│   │
│   ├── services/                     # Client API centralisé + services par domaine
│   │   ├── api.ts                     # Instance Axios (base URL, intercepteurs, JWT)
│   │   ├── auth.service.ts             # Login, register, OTP, Google
│   │   ├── user.service.ts              # Profil utilisateur connecté (getMe, updateMe...)
│   │   ├── profile.service.ts            # Profil fitness (objectifs, poids, IMC)
│   │   ├── dashboard.service.ts           # Données du tableau de bord
│   │   ├── tracking.service.ts             # Eau, sommeil, pas, calories brûlées
│   │   ├── meals.service.ts                 # Journal de repas (CRUD)
│   │   ├── mealScanner.service.ts            # Scan photo IA
│   │   ├── openFoodFacts.service.ts           # Intégration OpenFoodFacts
│   │   ├── theMealDb.service.ts                # Intégration TheMealDB
│   │   ├── scanHistory.service.ts               # Historique des scans
│   │   ├── chatbot.service.ts                    # Conversations & messages IA
│   │   ├── reminder.service.ts                    # Rappels
│   │   └── notifications.service.ts                # Notifications locales (Expo)
│   │
│   ├── hooks/                         # useAuthBootstrap, useCompleteProfile,
│   │                                    # useEditProfile, useGoogleAuth,
│   │                                    # useStepTracker, useDebouncedValue
│   │
│   ├── types/                          # MealEntry, DashboardData, Profile, User,
│   │                                     # Tracking, Reminder, ChatbotMessage...
│   │
│   ├── constants/                       # colors.ts, profileSteps.ts
│   │
│   ├── utils/                           # formatters, storage (AsyncStorage wrapper),
│   │                                      # authNavigation, activity, media, slides,
│   │                                      # profileValidation, Pagination
│   │
│   └── global.css                        # Styles globaux (NativeWind/Tailwind si utilisé)
│
├── assets/                             # Images, polices, icônes
├── plugins/                             # Config plugins Expo custom
├── scripts/                              # Scripts utilitaires (reset-project.js)
├── android/                               # Projet natif Android généré
├── app.json                                # Configuration Expo (nom, icône, splash, plugins)
├── eas.json                                 # Configuration des builds EAS
└── tsconfig.json                             # Configuration TypeScript
```

---

## 🧭 Navigation (Expo Router)

Le routage est **basé sur les fichiers** : chaque fichier dans `src/app/` correspond à une route.

- `_layout.tsx` (racine) : définit un `Stack` global sans en-tête, avec le geste de retour désactivé sur `complete-profile` (empêche l'utilisateur d'abandonner le wizard).
- `(tabs)/_layout.tsx` : définit la **barre d'onglets** principale (Home, Nutrition, Chatbot, Profil).
- Les écrans hors du groupe `(tabs)` (scanner, détails, paramètres...) s'ouvrent en **pile** (Stack) au-dessus de la barre d'onglets, via `router.push(...)`.
- Les écrans de détail reçoivent leurs données via **paramètres de route** (`router.push({ pathname: "...", params: {...} })`).

**Flux de navigation typique** :
```
index.tsx → welcome.tsx → login/register.tsx → CodeOTP.tsx
   → complete-profile.tsx (si profil incomplet) → (tabs)/Home.tsx
```

---

## 🖥️ Écrans de l'application

| Écran | Rôle |
|---|---|
| `index.tsx` | Détecte l'état de session (`useAuthBootstrap`) et redirige vers welcome / home |
| `welcome.tsx` | Écran d'accueil avant connexion |
| `Onboarding.tsx` | Carrousel de présentation de l'app (premier lancement) |
| `login.tsx` / `register.tsx` | Formulaires d'authentification (Formik + Yup) |
| `CodeOTP.tsx` | Saisie et validation du code OTP (inscription ou reset) |
| `forgot-password.tsx` / `reset-password.tsx` | Flux de récupération de mot de passe |
| `complete-profile.tsx` | Wizard multi-étapes de complétion du profil fitness |
| `(tabs)/Home.tsx` | **Écran central** : salutation, résumé calorique/macros, eau, sommeil, pas, journal de repas consolidé, bande hebdomadaire |
| `(tabs)/nutrition.tsx` | Recherche d'aliments et de recettes |
| `nutrition-foods.tsx` / `nutrition-food-details.tsx` | Liste et détail d'aliments |
| `nutrition-meals.tsx` / `nutrition-meal-details.tsx` | Liste et détail de repas/recettes |
| `nutrition-scanner.tsx` | Scan de code-barres (OpenFoodFacts) + historique inline |
| `nutrition-meal-scanner.tsx` | Scan de repas par photo (analyse IA) + historique inline |
| `nutrition-scan-details.tsx` | Détail d'un scan historique (image, macros, badge de confiance, éléments détectés, note IA) |
| `(tabs)/chatbot.tsx` | Interface de chat avec l'assistant santé/fitness |
| `(tabs)/profile.tsx` | Vue du profil, statistiques, historique poids/IMC |
| `edit-profile.tsx` | Édition des informations de profil |
| `settings.tsx` | Paramètres généraux et gestion des rappels |

---

## 🧩 Composants

Organisés **par domaine fonctionnel** sous `src/components/`, avec un principe de composition forte (aucune logique métier lourde dans les composants — celle-ci reste dans les hooks/services).

Points notables :
- **`home/`** regroupe tous les blocs de la page d'accueil consolidée : `WaterCard`, `SleepCard`, `StepsCard`, `MacroRing` (anneau de macros), `CalorieSummary`, `MealSection` (journal de repas), `AddMealSheet` (bottom sheet d'ajout de repas — manuel / scan code-barres / scan photo), `WeekStrip` (sélecteur de jour), `TimePickerModal`.
- **`nutrition/`** fournit les briques réutilisées par les écrans de recherche et de scan : `NutriScoreBadge`, `EmptyState`, `ScreenHeader` (en-tête standard avec retour), `FoodListItem`, `MealListItem`, `Chip` (filtres).
- **`profile/`** contient les composants du wizard de profil (`WizardNav`, `ProfileWizardHeader`, `ProfileProgress`) et les sélecteurs custom (`HorizontalRulerPicker`, `VerticalRulerPicker`, `VerticalNumberPicker`, `WaterGoalPicker`, `StepGoalPicker`), ainsi que `WeightProgressChart` et `DailyStatsCalendar`.
- **`chatbot/`** : `MessageBubble` (bulle utilisateur/IA), `TypingIndicator`, `ConversationHistoryModal`.

---

## 🌐 Couche services (API)

Toute communication réseau passe par **`src/services/api.ts`**, une instance Axios unique configurée avec :
- l'URL de base (`EXPO_PUBLIC_API_URL`)
- l'injection automatique du token JWT dans l'en-tête `Authorization`
- une fonction utilitaire `getServerBaseUrl()` pour construire les chemins absolus des fichiers uploadés (photos)

Chaque domaine métier a son propre fichier `*.service.ts` qui encapsule les appels à l'API correspondants aux routes du backend (voir [README backend](../backend/README.md#-endpoints-de-lapi)) :

| Service | Domaine couvert |
|---|---|
| `auth.service.ts` | `/api/auth/*` |
| `user.service.ts` | `/api/users/*` |
| `profile.service.ts` | `/api/profile/*` |
| `dashboard.service.ts` | `/api/dashboard` |
| `tracking.service.ts` | `/api/tracking/*` (eau, sommeil, pas, calories brûlées) |
| `meals.service.ts` | `/api/meals/*` (journal de repas) |
| `mealScanner.service.ts` | `/api/nutrition/scan-meal` |
| `scanHistory.service.ts` | `/api/nutrition/history/*` |
| `reminder.service.ts` | `/api/reminders/*` |
| `chatbot.service.ts` | `/api/chatbot/*` |
| `openFoodFacts.service.ts` | API externe OpenFoodFacts (recherche code-barres) |
| `theMealDb.service.ts` | API externe TheMealDB (recettes) |
| `notifications.service.ts` | Notifications locales (Expo Notifications) |

---

## 🪝 Hooks personnalisés

| Hook | Rôle |
|---|---|
| `useAuthBootstrap` | Vérifie la session au démarrage (token stocké, validité) et détermine la route initiale |
| `useCompleteProfile` | Gère l'état et la soumission du wizard de complétion de profil |
| `useEditProfile` | Gère l'état et la soumission du formulaire d'édition de profil |
| `useGoogleAuth` | Encapsule le flux de connexion Google Sign-In |
| `useStepTracker` | Lit le podomètre (expo-sensors) et synchronise les pas avec le backend |
| `useDebouncedValue` | Anti-rebond générique, utilisé notamment pour les champs de recherche |

---

## 🏷️ Types partagés

Définis dans `src/types/`, alignés sur les réponses de l'API backend :

- `user.ts` — utilisateur authentifié (`full_name`, `email`, `profile_photo`...)
- `profile.ts` — profil fitness (objectifs, mensurations, préférences)
- `dashboard.ts` — agrégat du tableau de bord
- `tracking.ts` — eau, sommeil, pas, calories brûlées
- `nutrition.ts` — `MealEntry`, `NewMealEntry`, `MealType`, `MealEntrySource` (manuel / code-barres / photo), aliments, Nutri-Score
- `meal.ts` — repas/recettes (recherche, détail)
- `reminder.ts` — rappels (fréquence, jours actifs, heure)
- `chatbot.ts` — conversations et messages

---

## 🔐 Gestion de l'authentification

1. Le token JWT reçu à la connexion est stocké via `utils/storage.ts` (wrapper autour d'AsyncStorage).
2. `useAuthBootstrap` relit ce token au lancement pour restaurer la session sans reconnexion.
3. `services/api.ts` attache automatiquement le token à chaque requête sortante.
4. `utils/authNavigation.ts` centralise la logique de redirection post-authentification (profil incomplet → wizard, sinon → Home).
5. En cas de token invalide/expiré (401 renvoyé par le backend), l'utilisateur est redirigé vers l'écran de connexion.

---

## 📦 Build & déploiement (EAS)

Le projet est configuré pour **Expo Application Services (EAS)** via `eas.json`.

```bash
# Build de développement (avec expo-dev-client)
eas build --profile development --platform android

# Build de production
eas build --profile production --platform android
eas build --profile production --platform ios

# Soumission aux stores
eas submit --platform android
eas submit --platform ios
```

⚠️ Les fichiers de signature Android (`.jks`) présents à la racine du dossier `frontend/` sont **sensibles** : ils ne doivent jamais être exposés publiquement ni committés dans un dépôt partagé sans protection (utiliser EAS Credentials ou un stockage sécurisé).

---

## 📐 Conventions de code

- **TypeScript strict** pour tous les nouveaux fichiers (`.tsx` / `.ts`) — seul `BottomTabBar` reste en `.jsx` (legacy).
- **Un composant = une responsabilité** : la logique de récupération de données vit dans les hooks/services, pas dans le JSX.
- **`SafeAreaView` + `ScreenHeader`** comme squelette standard des écrans secondaires.
- **`useFocusEffect`** utilisé pour recharger les données à chaque retour sur un écran (plutôt que `useEffect` seul), afin de refléter les changements faits sur d'autres écrans.
- **Navigation par `router.push`** avec passage de paramètres typés pour les écrans de détail.
- Toute nouvelle fonctionnalité front est précédée d'un **audit du code existant** (composants, services, types déjà en place) avant implémentation, afin de maximiser la réutilisation.

---

## 🩺 Dépannage

| Problème | Solution |
|---|---|
| L'app ne peut pas joindre l'API sur appareil physique | Vérifier que `EXPO_PUBLIC_API_URL` utilise l'IP locale (pas `localhost`) et que le téléphone est sur le même réseau Wi-Fi |
| Erreur liée à un module natif (Health Connect, dev-client...) | Ces modules nécessitent un **build natif** (`expo run:android`/`expo run:ios`) — ils ne fonctionnent pas dans Expo Go |
| Connexion Google échoue | Vérifier que les Client IDs (`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` / `...ANDROID_CLIENT_ID`) correspondent à ceux configurés dans Google Cloud Console, avec les bonnes empreintes SHA-1 |
| Cache Metro corrompu | `npx expo start -c` pour vider le cache |
| Réinitialiser le projet | `npm run reset-project` |
