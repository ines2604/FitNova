import { SessionExercise } from "@/types/session";

export type WorkoutPlayerStep =
  | {
      kind: "work";
      exerciseIndex: number;
      setIndex: number;
      durationSeconds: number;
      sessionExercise: SessionExercise;
    }
  | {
      kind: "rest";
      exerciseIndex: number;
      setIndex: number;
      durationSeconds: number;
      sessionExercise: SessionExercise;
    };

export const buildWorkoutPlayerSteps = (exercises: SessionExercise[]): WorkoutPlayerStep[] => {
  const steps: WorkoutPlayerStep[] = [];
  for (let exerciseIndex = 0; exerciseIndex < exercises.length; exerciseIndex++) {
    const ex = exercises[exerciseIndex];
    const sets = Math.max(1, ex.sets || 1);
    const work = ex.duration_seconds ?? 60;
    const rest = ex.rest_seconds ?? 0;

    for (let setIndex = 0; setIndex < sets; setIndex++) {
      steps.push({
        kind: "work",
        exerciseIndex,
        setIndex,
        durationSeconds: work,
        sessionExercise: ex,
      });

      const isLastSetOfSession =
        exerciseIndex === exercises.length - 1 && setIndex === sets - 1;
      if (!isLastSetOfSession && rest > 0) {
        steps.push({
          kind: "rest",
          exerciseIndex,
          setIndex,
          durationSeconds: rest,
          sessionExercise: ex,
        });
      }
    }
  }
  return steps;
};

export type SavedPlayerState = {
  stepIndex: number;
  remainingSeconds: number;
  activeSeconds: number;
};

export const playerStorageKey = (scheduledId: number | string) =>
  `@fitnova_workout_player_${scheduledId}`;

/** Index de la pause qui suit la série courante, ou de l'étape suivante s'il n'y a pas de repos. */
export const nextRestOrFollowingIndex = (
  steps: WorkoutPlayerStep[],
  currentIndex: number
): number => {
  for (let i = currentIndex + 1; i < steps.length; i++) {
    if (steps[i].kind === "rest") return i;
  }
  return currentIndex + 1;
};
