# 📱 FitNova — Frontend

Application mobile **React Native / Expo** de FitNova, écrite en **TypeScript** avec **Expo Router** pour un routage basé sur les fichiers. Six onglets : **Accueil, Nutrition, Jeûne, Sport, Chatbot, Profil**.

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
- [Types, constantes et utilitaires](#-types-constantes-et-utilitaires)
- [Gestion de l'authentification](#-gestion-de-lauthentification)
- [Pas, Health Connect et notifications](#-pas-health-connect-et-notifications)
- [Build & déploiement (EAS)](#-build--déploiement-eas)
- [Conventions de code](#-conventions-de-code)
- [Points à nettoyer](#-points-à-nettoyer)
- [Dépannage](#-dépannage)

---

## 🧰 Stack & prérequis

| Élément | Version / Outil |
|---|---|
| React Native | 0.85.3 |
| Expo SDK | 56 (`experiments` : `typedRoutes`, `reactCompiler`) |
| React | 19.2.3 |
| TypeScript | ~6.0.3 (mode `strict`) |
| Routing | Expo Router ~56.2 (basé sur les fichiers) |
| Client HTTP | Axios |
| État & formulaires | React Hooks (`useState`, hooks métier) et validation manuelle (`utils/profileValidation.ts`, `validate()` dans `login.tsx` / `register.tsx`) |
| Graphiques & dessin | react-native-svg (courbes, anneaux) |
| UI | expo-linear-gradient, expo-image, API `Animated` de React Native, `@expo/vector-icons` (Ionicons) |
| Auth Google | `@react-native-google-signin/google-signin` |
| Capteurs & natif | expo-sensors (podomètre), react-native-health-connect (Android), expo-camera (scan de code-barres), expo-image-picker |
| Notifications | expo-notifications (notifications locales) |
| Sélecteurs | @react-native-community/datetimepicker |
| Stockage local | @react-native-async-storage/async-storage |

**Prérequis machine** :
- Node.js ≥ 18 et npm
- Android Studio (ou un appareil Android) pour un build natif ; le dépôt ne contient qu'un projet natif **Android** (`android/`)
- Un backend FitNova accessible (voir le [README backend](../backend/README.md))

> ⚠️ Le projet utilise des modules natifs (`react-native-health-connect`, Google Sign-In, `expo-dev-client`) : il **ne fonctionne pas dans Expo Go**. Il faut un *development build* (`npm run android`, ou un build EAS `development`).

---

## ⚙️ Installation

```bash
cd frontend
npm install
```

Créer le fichier `.env` (voir section suivante), puis compiler et lancer l'application sur un appareil ou un émulateur Android :

```bash
npm run android
```

Une fois le development build installé, le serveur de développement se relance avec :

```bash
npm start        # ouvre Metro ; appuyer sur `a` pour Android
```

---

## 🔑 Configuration (.env)

Créer un fichier `.env` à la racine de `frontend/` (le dépôt ne fournit pas de `.env.example`) :

```env
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
EXPO_PUBLIC_API_URL=http://192.168.1.XX:5000/api
```

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Client ID OAuth Google (type Web) : passé à `GoogleSignin.configure()` pour obtenir l'`idToken` envoyé au backend |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | Client ID OAuth Google (type Android) — non lu directement par le code frontend actuel |
| `EXPO_PUBLIC_API_URL` | URL de base de l'API, **suffixe `/api` compris**. Sans elle, l'app retombe sur `http://localhost:5000/api`. Sur appareil physique ou émulateur, utiliser l'IP locale de la machine du backend, pas `localhost` |

> Le préfixe `EXPO_PUBLIC_` est requis par Expo pour exposer une variable au bundle client. Les variables sont donc **visibles dans l'application** : n'y mettre aucun secret.

---

## 📜 Scripts disponibles

| Commande | Description |
|---|---|
| `npm start` | Démarre le serveur de développement Expo (Metro) |
| `npm run android` | Build natif et lancement sur émulateur/appareil Android (`expo run:android`) |
| `npm run ios` | Build natif iOS (`expo run:ios`) — aucun projet iOS n'est présent dans le dépôt, et le suivi des pas repose sur Health Connect (Android) |
| `npm run web` | Lance `expo start --web` ; l'application repose sur des modules natifs, le web n'est pas une cible |
| `npm run lint` | Analyse statique du code (`expo lint`) |
| `npm run reset-project` | Script du modèle Expo (`scripts/reset-project.js`) qui **réinitialise le projet** : à ne pas lancer sur ce projet |

---

## 🗂️ Structure du projet

```
frontend/
├── src/
│   ├── app/                          # Écrans — routage par fichiers (Expo Router)
│   │   ├── (tabs)/                    # Groupe de routes avec barre d'onglets
│   │   │   ├── Home.tsx                # Accueil : tableau de bord du jour
│   │   │   ├── nutrition.tsx            # Hub Nutrition (aliments, repas, scanners, favoris)
│   │   │   ├── fasting.tsx               # Jeûne : suivi en direct, calendrier, historique
│   │   │   ├── workouts.tsx               # Hub Sport (exercices, séances, calendrier)
│   │   │   ├── chatbot.tsx                 # Assistant santé/fitness
│   │   │   ├── profile.tsx                  # Profil : accès aux stats, photos, paramètres
│   │   │   └── _layout.tsx                   # Barre d'onglets + garde de session + resynchro des rappels
│   │   ├── index.tsx                   # Point d'entrée : vérifie la session et redirige
│   │   ├── welcome.tsx / Onboarding.tsx # Bienvenue et carrousel d'introduction
│   │   ├── login / register / CodeOTP / forgot-password / reset-password .tsx
│   │   ├── complete-profile.tsx / edit-profile.tsx
│   │   ├── settings.tsx / Stats.tsx / progress-photos.tsx
│   │   ├── nutrition-*.tsx              # foods, food-details, meals, meal-details, scanner,
│   │   │                                   # meal-scanner, scan-details, favorites
│   │   ├── fasting-plan.tsx / fasting-tips.tsx
│   │   ├── workouts-*.tsx                # exercises, exercise-details, favorites, sessions,
│   │   │                                   # session-builder, generator, calendar, active-session
│   │   └── _layout.tsx                    # Layout racine (Stack sans en-tête)
│   │
│   ├── components/                   # Composants réutilisables, par domaine
│   │   ├── home/  nutrition/  fasting/  workouts/  profile/  chatbot/  settings/
│   │   └── AppTextInput, BottomTabBar (.jsx), HomeHeader, NextButton,
│   │       OnboardingItem, Paginator
│   ├── services/                     # Client Axios + services par domaine + API externes
│   ├── hooks/                        # Hooks métier
│   ├── types/                        # Types TypeScript alignés sur l'API
│   ├── constants/                    # colors.ts, profileSteps.ts
│   ├── utils/                        # Formatage, stockage, navigation d'auth, graphiques, etc.
│   └── global.css                    # Variables CSS de polices (utilisées côté web uniquement)
│
├── assets/                           # Images, icônes, polices
├── plugins/withMinSdkVersion.js       # Config plugin Expo : force minSdkVersion = 26 (Health Connect)
├── scripts/reset-project.js            # Script du modèle Expo (voir avertissement ci-dessus)
├── android/                            # Projet natif Android généré
├── app.json                             # Configuration Expo (permissions, plugins, projet EAS)
├── eas.json                              # Profils de build EAS
├── tsconfig.json                          # TypeScript strict + alias `@/*` → `src/*`
├── AGENTS.md / CLAUDE.md                   # Consignes pour assistants de code (docs Expo SDK 56)
└── package.json
```

---

## 🧭 Navigation (Expo Router)

Le routage est **basé sur les fichiers** : chaque fichier de `src/app/` est une route.

- `_layout.tsx` (racine) : `Stack` sans en-tête, avec le geste de retour désactivé sur `complete-profile` (l'utilisateur ne peut pas abandonner le wizard).
- `(tabs)/_layout.tsx` : barre d'onglets personnalisée (`BottomTabBar`) avec **six onglets** : Accueil, Nutrition, Jeûne, Sport, Chatbot, Profil. Ce layout vérifie aussi la session à l'ouverture et resynchronise les rappels locaux.
- Les onglets **Nutrition**, **Sport** et **Profil** sont des hubs : ils ouvrent des écrans en pile (`router.push`) au-dessus de la barre d'onglets.
- Les écrans de détail reçoivent leurs données via paramètres de route (`useLocalSearchParams`). Le mode « choisir un exercice pour une séance » utilise `pickMode` et un mini pub/sub (`utils/exercisePicker.ts`) pour renvoyer l'exercice choisi au constructeur de séance.
- `typedRoutes` est activé : les types de routes sont générés dans `.expo/types/router.d.ts`.

**Flux d'entrée** :
```
index.tsx ──▶ pas de token ────────────▶ Onboarding ▶ welcome ▶ login / register
          ├─▶ profil incomplet ────────▶ complete-profile
          └─▶ profil complet ──────────▶ (tabs)/Home

register ▶ CodeOTP ▶ (navigation post-auth)
login    ▶ (403 e-mail non vérifié) ▶ CodeOTP
login    ▶ (navigation post-auth) ▶ complete-profile ou Home
forgot-password ▶ CodeOTP ▶ reset-password ▶ login
```

---

## 🖥️ Écrans de l'application

### Authentification et profil
| Écran | Rôle |
|---|---|
| `index.tsx` | Vérifie la session (`useAuthBootstrap`) et redirige ; en cas d'erreur réseau, affiche un message avec un bouton « Réessayer » |
| `Onboarding.tsx` / `welcome.tsx` | Carrousel d'introduction, puis choix connexion / inscription |
| `login.tsx` / `register.tsx` | Formulaires (validation manuelle) ; le bouton Google Sign-In se trouve sur `login.tsx` |
| `CodeOTP.tsx` | Saisie du code OTP (inscription ou réinitialisation) |
| `forgot-password.tsx` / `reset-password.tsx` | Récupération du mot de passe |
| `complete-profile.tsx` | Wizard de 8 étapes : âge, sexe, taille, poids, niveau d'activité, objectif, objectif d'eau, objectif de pas |
| `edit-profile.tsx` | Édition des informations du profil |
| `settings.tsx` | Gestion des rappels (eau, activité, sommeil) |

### Onglets
| Écran | Rôle |
|---|---|
| `(tabs)/Home.tsx` | Salutation, bande hebdomadaire, résumé calorique et macros, journal de repas, eau, sommeil, pas |
| `(tabs)/nutrition.tsx` | Hub : Aliments, Repas, Scanner code-barres, Scanner photo, Favoris |
| `(tabs)/fasting.tsx` | Jeûne en cours (anneau, temps écoulé, terminer / annuler), jeûne planifié, démarrage immédiat, calendrier et détail par jour, accès aux conseils |
| `(tabs)/workouts.tsx` | Hub : Exercices, Mes séances, Calendrier |
| `(tabs)/chatbot.tsx` | Chat avec l'assistant, historique et gestion des conversations |
| `(tabs)/profile.tsx` | Infos et objectif calorique, calendrier de stats journalières, accès à Statistiques, Photos de progression, Paramètres, édition du profil, changement de photo, déconnexion |

### Nutrition
| Écran | Rôle |
|---|---|
| `nutrition-foods.tsx` / `nutrition-food-details.tsx` | Recherche d'aliments (OpenFoodFacts, filtres) et détail avec choix de la portion avant ajout |
| `nutrition-meals.tsx` / `nutrition-meal-details.tsx` | Recettes (TheMealDB) par nom, catégorie, zone ou ingrédient, repas aléatoire, « À découvrir », et détail |
| `nutrition-scanner.tsx` | Scan de code-barres (`expo-camera`) et historique des scans code-barres |
| `nutrition-meal-scanner.tsx` | Photo du repas (appareil ou galerie), analyse IA et historique des scans photo |
| `nutrition-scan-details.tsx` | Détail d'un scan (image, macros, badge de confiance, éléments détectés, note IA) |
| `nutrition-favorites.tsx` | Favoris nutrition, filtrables (Tous / Aliments / Repas) |

### Jeûne
| Écran | Rôle |
|---|---|
| `fasting-plan.tsx` | Planification d'un jeûne : date, heure de début, durée en heures (16 par défaut) |
| `fasting-tips.tsx` | Conseils sur le jeûne |

### Sport
| Écran | Rôle |
|---|---|
| `workouts-exercises.tsx` | Catalogue : recherche, filtres partie du corps / équipement, pagination, onglet favoris ; sert aussi de sélecteur d'exercice (`pickMode`) |
| `workouts-exercise-details.tsx` | Fiche d'un exercice : GIF (repli sur la vignette puis sur une icône) et consignes en français |
| `workouts-sessions.tsx` | Mes séances : liste, démarrage immédiat, accès au générateur et à la création |
| `workouts-session-builder.tsx` | Création / modification d'une séance : exercices, séries, durée par série, repos |
| `workouts-generator.tsx` | Génération de séance (objectif, niveau, lieu, focus, durée) puis enregistrement |
| `workouts-calendar.tsx` | Calendrier sport : planification d'une séance (avec rappel 30 min avant), détail du jour, annulation |
| `workouts-active-session.tsx` | Lecteur de séance : chrono série/repos, passer la série ou le repos, pause / reprise, annulation, écran de fin |
| `workouts-favorites.tsx` | Liste des exercices favoris (aucun lien de navigation ne pointe actuellement vers cet écran ; les favoris sont aussi accessibles dans l'onglet favoris de `workouts-exercises`) |

### Suivi
| Écran | Rôle |
|---|---|
| `Stats.tsx` | Graphiques d'évolution avec filtres de période (semaine / mois / année) : poids, calories, pas, heures de jeûne, durée des séances |
| `progress-photos.tsx` | Photos de progression : prise de photo ou galerie, date, poids associé, historique |

---

## 🧩 Composants

Organisés **par domaine** sous `src/components/`. La logique métier reste dans les hooks, services et utilitaires.

| Dossier | Contenu |
|---|---|
| `home/` | `WeekStrip`, `CalorieSummary`, `MacroRing`, `MealSection`, `AddMealSheet` (ajout manuel / scan code-barres / scan photo), `WaterCard`, `SleepCard`, `StepsCard`, `TimePickerModal` |
| `nutrition/` | `ScreenHeader`, `EmptyState`, `Chip`, `FoodListItem`, `MealListItem`, `NutriScoreBadge`, `PortionPicker`, `FavoriteButton` — réutilisés aussi par les écrans Sport |
| `fasting/` | `FastingRing`, `FastingCalendar`, `FastDayDetailCard` |
| `workouts/` | `ExerciseListItem`, `ExerciseMedia`, `WorkoutCalendar`, `WorkoutDayDetailCard` |
| `profile/` | Wizard (`WizardNav`, `ProfileWizardHeader`, `ProfileProgress`, `ChoiceOption`), sélecteurs (`HorizontalRulerPicker`, `VerticalRulerPicker`, `VerticalNumberPicker`, `WaterGoalPicker`, `StepGoalPicker`), `ProfileInfoCard`, `DailyStatsCalendar`, `PeriodFilterTabs`, graphiques (`WeightProgressChart`, `CaloriesEvolutionChart`, `StepsEvolutionChart`, `FastingHoursChart`, `WorkoutDurationChart`) |
| `chatbot/` | `MessageBubble`, `TypingIndicator`, `ConversationHistoryModal` |
| `settings/` | `ReminderTimePicker`, `FrequencyPicker`, `ActiveDaysPicker` |
| racine | `AppTextInput`, `HomeHeader`, `NextButton`, `OnboardingItem`, `Paginator`, `BottomTabBar` (le seul fichier en `.jsx`) |

---

## 🌐 Couche services (API)

Toute communication avec le backend passe par **`src/services/api.ts`**, une instance Axios unique :
- URL de base : `EXPO_PUBLIC_API_URL` (repli : `http://localhost:5000/api`), délai maximal de 15 s ;
- injection automatique du JWT (`Authorization: Bearer <token>`) ;
- normalisation des erreurs : elles exposent toujours un champ `message` lisible et un champ `status` ;
- `getServerBaseUrl()` (et `utils/media.ts`) pour construire les URL absolues des fichiers uploadés (`/uploads/...`).

| Service | Domaine couvert |
|---|---|
| `auth.service.ts` | `/api/auth/*` ; `logout()` annule les notifications locales et efface la session |
| `user.service.ts` | `/api/users/*` |
| `profile.service.ts` | `/api/profile/*` (et `isProfileComplete()`) |
| `dashboard.service.ts` | `/api/dashboard` |
| `tracking.service.ts` | `/api/tracking/*` (eau, pas, calories brûlées, sommeil) |
| `meals.service.ts` | `/api/meals/*` |
| `mealScanner.service.ts` | `/api/nutrition/scan-meal` |
| `scanHistory.service.ts` | `/api/nutrition/history/*` |
| `favorites.service.ts` | `/api/favorites/*` |
| `progressPhoto.service.ts` | `/api/progress-photos/*` |
| `reminder.service.ts` | `/api/reminders/*` |
| `chatbot.service.ts` | `/api/chatbot/*` |
| `fasting.service.ts` | `/api/fasting/*` |
| `exercises.service.ts` | `/api/exercises/*` |
| `sessions.service.ts` | `/api/sessions/*` (séances, exercices, génération IA) |
| `calendar.service.ts` | `/api/calendar/*` (planning, démarrage, pause, fin, historique, stats) |
| `openFoodFacts.service.ts` | API externe **OpenFoodFacts**, appelée directement : recherche (Search-a-licious en priorité, repli sur l'ancienne API) et lecture par code-barres |
| `theMealDb.service.ts` | API externe **TheMealDB**, appelée directement (recettes) |
| `notifications.service.ts` | Notifications locales (Expo Notifications) |

---

## 🪝 Hooks personnalisés

| Hook | Rôle |
|---|---|
| `useAuthBootstrap` | Détermine la route initiale au lancement (voir [authentification](#-gestion-de-lauthentification)) |
| `useCompleteProfile` | État, validation par étape et soumission du wizard de profil |
| `useEditProfile` | État et soumission du formulaire d'édition de profil |
| `useGoogleAuth` | Flux Google Sign-In : `idToken` Google → `/api/auth/google` |
| `useStepTracker` | Pas et calories d'activité : Health Connect ou podomètre, synchronisation avec le backend |
| `useDebouncedValue` | Anti-rebond, utilisé pour les champs de recherche |

---

## 🏷️ Types, constantes et utilitaires

**Types** (`src/types/`) : `user`, `profile`, `dashboard`, `tracking`, `meal` (`MealEntry`, `MealType`, `MealSource`, libellés et icônes), `nutrition` (aliments, Nutri-Score, recettes, résultats et historique de scan), `favorite`, `progressPhoto`, `reminder`, `chatbot`, `fasting`, `exercise`, `session`, `scheduledSession`.

**Constantes** : `colors.ts` (palette, couleur principale `#407BFF`) et `profileSteps.ts` (étapes du wizard).

**Utilitaires** (`src/utils/`) :

| Fichier | Rôle |
|---|---|
| `storage.ts` | Session (token et utilisateur) dans AsyncStorage |
| `authNavigation.ts` | Choix de l'écran d'arrivée après authentification |
| `formatters.ts` | Formatage de dates (toujours en heure locale) et libellés de profil |
| `profileValidation.ts` | Validation des étapes du wizard |
| `activity.ts` | Estimation des calories brûlées à partir des pas (formule MET) |
| `portion.ts` | Conversion des valeurs « pour 100 g » vers la portion mangée |
| `chartPeriod.ts`, `chartAxis.ts` | Filtres de période et graduations des graphiques |
| `exerciseLabels.ts` | Traduction française des valeurs du dataset d'exercices (affichage seulement) |
| `exercisePicker.ts` | Mini pub/sub pour choisir un exercice depuis le constructeur de séance |
| `workoutPlayerSteps.ts` | Découpage d'une séance en étapes (série / repos) pour le lecteur |
| `media.ts` | URL absolues des fichiers uploadés |
| `slides.ts`, `Pagination.ts` | Contenu et types du carrousel d'onboarding |

---

## 🔐 Gestion de l'authentification

1. Le JWT et l'utilisateur reçus à la connexion sont stockés dans AsyncStorage (`@fitnova/token`, `@fitnova/user`) via `utils/storage.ts`.
2. `services/api.ts` attache le token à chaque requête.
3. Au lancement, `useAuthBootstrap` appelle `getAuthDestination()` : **Onboarding** sans token, **complete-profile** si le profil est incomplet, sinon **Home**. `navigateAfterAuth()` applique la même règle après connexion, vérification OTP ou Google Sign-In.
4. `(tabs)/_layout.tsx` et `complete-profile.tsx` refont la même vérification à l'ouverture.
5. Sur une réponse `401` lors de cette vérification, la session locale et les notifications programmées sont effacées, et l'utilisateur est renvoyé vers **Onboarding**. Il n'y a **pas d'intercepteur global** : ailleurs, un `401` s'affiche comme une simple erreur d'écran.
6. Déconnexion (onglet Profil) : `logout()` annule les notifications locales, efface la session, puis retour vers `welcome`.
7. Connexion Google : `useGoogleAuth` ouvre le sélecteur de compte Google, récupère l'`idToken` et l'envoie au backend, qui le vérifie.

---

## 👣 Pas, Health Connect et notifications

**Pas et calories d'activité** (`useStepTracker`) : aucune saisie manuelle. Sources : **Health Connect** sur Android (Samsung Health, capteurs…) ou podomètre de l'appareil (`expo-sensors`). Le hook gère les états `checking`, `ready`, `unavailable`, `permission_denied` et `health_connect_not_installed`, rattrape automatiquement les 7 derniers jours et synchronise avec le backend. Les calories viennent de Health Connect quand elles sont disponibles, sinon d'une estimation à partir des pas (`utils/activity.ts`). Permissions Android déclarées dans `app.json` : lecture des pas et des calories (totales et actives).

**Notifications locales** (`notifications.service.ts`) :
- rappels **eau, activité et sommeil** (heure précise ou répétition toutes les 30 min / 1 h / 2 h, jours actifs), resynchronisés à chaque ouverture des onglets ;
- **jeûne** : démarrage, fin prévue et fin du jeûne ;
- **séances de sport** : rappel 30 min avant l'heure planifiée, annulé au démarrage ou à l'annulation de la séance ;
- toutes annulées à la déconnexion ; 200 notifications programmées au maximum.

---

## 📦 Build & déploiement (EAS)

`eas.json` définit trois profils : `development` (development client, distribution interne), `preview` (distribution interne) et `production` (incrémentation automatique de la version ; la version est gérée à distance). Le projet EAS est référencé dans `app.json`.

```bash
# Build de développement (avec expo-dev-client)
eas build --profile development --platform android

# Build de production
eas build --profile production --platform android

# Soumission au store
eas submit --platform android
```

Configuration Android (`app.json`) : `minSdkVersion` 26 (imposé par le plugin `withMinSdkVersion`), `softwareKeyboardLayoutMode: "pan"`, geste de retour prédictif désactivé. La section `ios` de `app.json` est vide : un build iOS demanderait une configuration supplémentaire (notamment pour Google Sign-In).

⚠️ Les fichiers de signature Android (`.jks`) présents à la racine de `frontend/` sont **sensibles** : ils sont ignorés par `.gitignore`, mais ne doivent jamais être publiés ni inclus dans une archive partagée (préférer EAS Credentials).

---

## 📐 Conventions de code

- **TypeScript strict** ; seul `BottomTabBar` reste en `.jsx`.
- **Alias d'import** : `@/` → `src/` (défini dans `tsconfig.json`) ; quelques fichiers plus anciens utilisent encore des imports relatifs.
- **Un composant = une responsabilité** : récupération de données dans les hooks et services, pas dans le JSX.
- **`SafeAreaView` + `ScreenHeader`** comme squelette des écrans secondaires.
- **`useFocusEffect`** pour recharger les données à chaque retour sur un écran.
- **Dates en heure locale** : ne jamais utiliser `toISOString()` pour obtenir une date du jour (elle donnerait la veille entre 0 h et 1 h en Tunisie) ; passer par `formatters.ts`.
- **Gestion d'erreurs** : les erreurs Axios exposent `message` et `status`, les écrans les affichent via `Alert` ou `EmptyState`.
- Toute nouvelle fonctionnalité front est précédée d'un **audit du code existant** (composants, services, types) pour maximiser la réutilisation.

---

## 🧹 Points à nettoyer

- **Dépendances non importées dans `src/`** : `formik`, `yup`, `expo-auth-session`, `expo-video`, `expo-glass-effect`, `expo-status-bar`, `@expo/ui`, `expo-symbols`, `react-native-vector-icons`, `@react-navigation/*`, `expo-crypto`, `expo-device`, `expo-linking`, `expo-web-browser`, `expo-font`, `expo-splash-screen`, `expo-system-ui`, `react-native-reanimated`, `react-native-gesture-handler`. Certaines peuvent rester nécessaires indirectement (dépendances d'Expo Router ou de modules natifs, plugins d'`app.json`) : à vérifier avant de les retirer.
- **Fichiers `*.snippet.ts`** (`services/notifications.workout.snippet.ts`, `utils/chartPeriod.workout.snippet.ts`) : ce sont des extraits « à ajouter à… » dont le code figure déjà dans `notifications.service.ts` et `chartPeriod.ts`. Ils ne sont importés nulle part et peuvent être supprimés.
- **`global.css`** : contient uniquement des variables de polices, et aucun style utilitaire (Tailwind/NativeWind) n'est utilisé.
- **`workouts-favorites.tsx`** : écran sans lien de navigation (voir plus haut).

---

## 🩺 Dépannage

| Problème | Solution |
|---|---|
| L'app ne peut pas joindre l'API | Vérifier que `EXPO_PUBLIC_API_URL` utilise l'IP locale de la machine du backend (suffixe `/api` compris), que le téléphone est sur le même réseau et que le backend tourne. Après modification du `.env`, relancer Metro avec `npx expo start -c` |
| Erreur liée à un module natif (Health Connect, Google Sign-In, dev-client) | Ces modules nécessitent un **development build** ; ils ne fonctionnent pas dans Expo Go |
| Les pas restent à 0 | Vérifier l'état renvoyé par `useStepTracker` : Health Connect non installé, permission refusée ou capteur indisponible sur l'appareil |
| Connexion Google échoue | Vérifier les Client IDs et les empreintes SHA-1 dans Google Cloud Console ; côté backend, `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_ID_ANDROID` |
| Les images/GIF d'exercices ne s'affichent pas | Le GIF retombe sur la vignette puis sur une icône ; vérifier l'accès réseau aux médias du dataset ou `EXERCISE_MEDIA_BASE_URL` côté backend |
| Les notifications ne s'affichent pas | Vérifier l'autorisation de notification de l'appareil ; les rappels se resynchronisent à l'ouverture des onglets |
| Cache Metro corrompu | `npx expo start -c` |
