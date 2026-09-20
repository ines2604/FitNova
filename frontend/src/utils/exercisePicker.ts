// Mini pub/sub (sans dépendance externe type zustand) utilisé uniquement pour
// le flux "choisir un exercice pour une séance" : l'écran liste d'exercices
// (en mode sélection) appelle pickExercise() puis fait router.back() ; l'écran
// constructeur de séance s'abonne pendant qu'il est monté et reçoit l'exercice
// choisi sans avoir à faire transiter des query params complexes entre deux
// écrans du même stack de navigation.

export type PickedExercise = {
  id: string;
  name: string;
  imageUrl: string | null;
  bodyPart: string;
};

let listener: ((exercise: PickedExercise) => void) | null = null;

export function setExercisePickListener(callback: ((exercise: PickedExercise) => void) | null) {
  listener = callback;
}

export function pickExercise(exercise: PickedExercise) {
  listener?.(exercise);
}
