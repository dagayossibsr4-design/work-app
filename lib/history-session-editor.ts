import type { SetLog, WorkoutSession } from "./workout-store";

export function addExerciseToHistorySession(session: WorkoutSession, exerciseId: string, target = "8–12", now = Date.now()): WorkoutSession {
  const trimmedExerciseId = exerciseId.trim();
  if (!trimmedExerciseId || session.sets.some((set) => set.exerciseId === trimmedExerciseId)) return session;
  const newSets: SetLog[] = [1, 2].map((setNumber) => ({
    id: `${session.id}-${trimmedExerciseId}-${setNumber}-${now}`,
    exerciseId: trimmedExerciseId,
    setNumber,
    weight: "",
    reps: "",
    completed: false,
    target,
  }));
  return { ...session, sets: [...session.sets, ...newSets] };
}

export function addSetToHistoryExercise(session: WorkoutSession, exerciseId: string, now = Date.now()): WorkoutSession {
  const exerciseSets = session.sets.filter((set) => set.exerciseId === exerciseId);
  const setNumber = exerciseSets.length ? Math.max(...exerciseSets.map((set) => set.setNumber)) + 1 : 1;
  const target = exerciseSets[exerciseSets.length - 1]?.target ?? "8–12";
  const newSet: SetLog = {
    id: `${session.id}-${exerciseId}-${setNumber}-${now}`,
    exerciseId,
    setNumber,
    weight: "",
    reps: "",
    completed: false,
    target,
  };
  return { ...session, sets: [...session.sets, newSet] };
}

export function removeSetFromHistorySession(session: WorkoutSession, set: SetLog): WorkoutSession {
  return {
    ...session,
    sets: session.sets
      .filter((candidate) => candidate.id !== set.id)
      .map((candidate) => candidate.exerciseId === set.exerciseId && candidate.setNumber > set.setNumber ? { ...candidate, setNumber: candidate.setNumber - 1 } : candidate),
  };
}

export function removeExerciseFromHistorySession(session: WorkoutSession, exerciseId: string): WorkoutSession {
  return { ...session, sets: session.sets.filter((set) => set.exerciseId !== exerciseId) };
}
