import { ProfileFormValues, ProfileStep } from "../types/profile";

export const INITIAL_PROFILE_VALUES: ProfileFormValues = {
  age: "25",
  gender: null,
  heightCm: "170",
  weightKg: "70",
  activityLevel: null,
  goal: null,
  dailyWaterGoalMl: "2000",
  dailyStepGoal: "10000",
};

export const PROFILE_STEPS: ProfileStep[] = [
  {
    key: "age",
    headerTitle: "Âge",
    title: "Quel âge as-tu ?",
    subtitle: "Cela nous aide à personnaliser tes recommandations.",
    inputType: "number",
    placeholder: "Ex : 25",
    unit: "ans",
    icon: "calendar-outline",
  },
  {
    key: "gender",
    headerTitle: "Sexe",
    title: "Quel est ton sexe ?",
    subtitle: "Utilisé pour estimer tes besoins caloriques.",
    inputType: "choice",
    options: [
      { value: "male", label: "Homme" },
      { value: "female", label: "Femme" },
    ],
  },
  {
    key: "heightCm",
    headerTitle: "Taille",
    title: "Quelle est ta taille ?",
    subtitle: "Indique ta taille en centimètres.",
    inputType: "number",
    placeholder: "Ex : 170",
    unit: "cm",
    icon: "resize-outline",
  },
  {
    key: "weightKg",
    headerTitle: "Poids",
    title: "Quel est ton poids ?",
    subtitle: "Tu pourras le mettre à jour plus tard.",
    inputType: "decimal",
    placeholder: "Ex : 68.5",
    unit: "kg",
    icon: "barbell-outline",
  },
  {
    key: "activityLevel",
    headerTitle: "Activité",
    title: "Quel est ton niveau d'activité ?",
    subtitle: "Choisis l'option qui te correspond le mieux.",
    inputType: "choice",
    options: [
      {
        value: "sedentary",
        label: "Sédentaire",
        description: "Peu ou pas d'exercice",
      },
      {
        value: "light",
        label: "Légèrement actif",
        description: "1 à 3 séances par semaine",
      },
      {
        value: "moderate",
        label: "Modérément actif",
        description: "3 à 5 séances par semaine",
      },
      {
        value: "active",
        label: "Actif",
        description: "6 à 7 séances par semaine",
      },
      {
        value: "very_active",
        label: "Très actif",
        description: "Entraînement intensif quotidien",
      },
    ],
  },
  {
    key: "goal",
    headerTitle: "Objectif",
    title: "Quel est ton objectif ?",
    subtitle: "Nous adapterons tes calories quotidiennes en conséquence.",
    inputType: "choice",
    options: [
      { value: "weight_loss", label: "Perte de poids" },
      { value: "muscle_gain", label: "Prise de muscle" },
      { value: "maintenance", label: "Maintien" },
    ],
  },
  {
    key: "dailyWaterGoalMl",
    headerTitle: "Eau",
    title: "Combien d'eau par jour ?",
    subtitle: "Appuie sur la bouteille ou les boutons pour ajuster ton objectif.",
    inputType: "water",
    unit: "ml",
  },
  {
    key: "dailyStepGoal",
    headerTitle: "Pas",
    title: "Quel est ton objectif de pas ?",
    subtitle: "Choisis un objectif quotidien réaliste pour rester actif.",
    inputType: "steps",
    unit: "pas",
  },
];
