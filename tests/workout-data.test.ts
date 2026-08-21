import { describe, expect, it } from "vitest";
import { getTemplate, workoutTemplates } from "../lib/workout-data";
import { calculateVolume, createImportedWorkoutSessions, mergeImportedWorkoutSessions, sortWorkoutSessionsNewestFirst, type WorkoutSession } from "../lib/workout-store";

describe("Workout templates", () => {
  it("includes the six core PDF workouts and optional arms session", () => {
    const ids = workoutTemplates.map((template) => template.id);
    expect(ids.slice(0, 21)).toEqual(["push1", "pull1", "legs1", "push2", "pull2", "legs2", "arms", "abc-a", "abc-b", "abc-c", "abcd-a", "abcd-b", "abcd-c", "abcd-d", "ab-upper", "ab-lower", "full-body", "cardio", "cycling", "elliptical", "stairs"]);
    expect(ids).toEqual(expect.arrayContaining(["treadmill", "outdoor-run", "walking", "rowing", "swimming", "hiit"]));
  });

  it("matches the PUSH 2 photo structure with ten exercises and twenty-three sets", () => {
    const push = getTemplate("push2");
    expect(push.exercises.map((exercise) => exercise.name)).toEqual([
      "לחיצת חזה עליון במוט חופשי",
      "לחיצת חזה בשיפוע עם משקולות",
      "לחיצת חזה תחתון במכשיר",
      "פרפר חופשי בכבלים",
      "פרפר במכשיר ייעודי",
      "לחיצת כתפיים במכונת האמר",
      "הרחקת כתפיים לצדדים",
      "כתף קדמית בפולי תחתון עם כבל",
      "פשיטת מרפקים כנגד כבל",
      "פשיטת מרפקים בכבל — שתי ידיים בהצלבה",
    ]);
    expect(push.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0)).toBe(23);
    expect(push.exercises.find((exercise) => exercise.name === "פרפר במכשיר ייעודי")?.sets[0].restPause).toBe("Rest & Pause");
  });

  it("matches the LEGS 2 photo structure with seven exercises and sixteen sets", () => {
    const legs = getTemplate("legs2");
    expect(legs.exercises.map((exercise) => exercise.name)).toEqual([
      "האק סקוואט במכונה",
      "מכרעים",
      "כפיפת ברך/ירך במכשיר",
      "פשיטת ברכיים במכונה",
      "כפיפת ירך בעמידה",
      "מקרבי ירך במכונה",
      "תאומים",
    ]);
    expect(legs.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0)).toBe(16);
    expect(legs.exercises.find((exercise) => exercise.name === "האק סקוואט במכונה")?.sets[0].restPause).toContain("3 דקות");
  });

  it("matches the Legs 1 photo structure with eight exercises and twenty sets", () => {
    const legs = getTemplate("legs1");
    expect(legs.exercises.map((exercise) => exercise.name)).toEqual([
      "סקוואט חופשי",
      "לג פרס",
      "כפיפת ברכיים בשכיבה",
      "כפיפת ברכיים בעמידה",
      "פשיטת ברכיים במכונה",
      "מקרבי ירך במכונה",
      "מרחיקי ירך במכונה",
      "תאומים בישיבה",
    ]);
    expect(legs.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0)).toBe(20);
    expect(legs.exercises.some((exercise) => exercise.note?.includes("Rest Pause"))).toBe(true);
  });
});

describe("Workout calculations", () => {
  it("calculates volume only from numeric completed or entered values", () => {
    const session: WorkoutSession = {
      id: "test",
      templateId: "push1",
      startedAt: new Date().toISOString(),
      sets: [
        { id: "1", exerciseId: "a", setNumber: 1, weight: "50", reps: "10", completed: true },
        { id: "2", exerciseId: "a", setNumber: 2, weight: "", reps: "12", completed: false },
        { id: "3", exerciseId: "b", setNumber: 1, weight: "20.5", reps: "8", completed: true },
      ],
    };
    expect(calculateVolume(session)).toBe(664);
  });
});

describe("יומנים שיובאו מהצילומים", () => {
  it("מוסיף את PULL 1, PULL 2 ו־LEGS 2 בתאריכים הנכונים ובלי סטים חסרים", () => {
    const sessions = createImportedWorkoutSessions();
    const pull1 = sessions.find((session) => session.id === "imported-pull1-2026-08-13");
    const pull2 = sessions.find((session) => session.id === "imported-pull2-2026-08-18");
    const legs2 = sessions.find((session) => session.id === "imported-legs2-2026-08-20");

    expect(pull1?.startedAt.startsWith("2026-08-13")).toBe(true);
    expect(pull1?.sets).toHaveLength(25);
    expect(pull1?.sets.find((set) => set.exerciseId === "חתירה גבוהה במכונה/כבל")?.note).toContain("Rest & Pause");

    expect(pull2?.startedAt.startsWith("2026-08-18")).toBe(true);
    expect(pull2?.sets).toHaveLength(24);
    expect(pull2?.sets.filter((set) => set.exerciseId === "זוקפי גב").map((set) => `${set.weight}×${set.reps}`)).toEqual(["92×15", "96×15", "92×15"]);

    expect(legs2?.startedAt.startsWith("2026-08-20")).toBe(true);
    expect(legs2?.sets).toHaveLength(15);
    expect(legs2?.sets.filter((set) => set.exerciseId === "האק סקוואט-legs2").map((set) => `${set.weight}×${set.reps}`)).toEqual(["170×8", "150×9", "120×14", "90×20"]);
  });

  it("מחליף נתון LEGS 2 ישן בנתוני הצילום, בלי למחוק יומנים אישיים", () => {
    const oldLegs2: WorkoutSession = {
      id: "imported-legs2-2026-08-20",
      templateId: "legs2",
      startedAt: "2026-08-20T18:00:00.000Z",
      sets: [{ id: "old", exerciseId: "האק סקוואט-legs2", setNumber: 1, weight: "999", reps: "1", completed: true }],
    };
    const personalSession: WorkoutSession = { id: "personal-session", templateId: "pull1", startedAt: "2026-08-21T18:00:00.000Z", sets: [] };
    const merged = mergeImportedWorkoutSessions([oldLegs2, personalSession]);

    expect(merged.find((session) => session.id === "personal-session")).toEqual(personalSession);
    expect(merged.find((session) => session.id === "imported-legs2-2026-08-20")?.sets).toHaveLength(15);
    expect(merged.find((session) => session.id === "imported-legs2-2026-08-20")?.sets[0].weight).toBe("170");
  });

  it("מציג את האימון המאוחר ביותר כאימון האחרון, ללא תלות בסדר הטעינה", () => {
    const sessions = createImportedWorkoutSessions();
    expect(sortWorkoutSessionsNewestFirst([...sessions].reverse())[0]?.startedAt.startsWith("2026-08-20")).toBe(true);
  });

  it("שומר את כל תרגילי PULL המיובאים כקבוצות נפרדות להצגה בהיסטוריה", () => {
    const sessions = createImportedWorkoutSessions();
    const pull1 = sessions.find((session) => session.id === "imported-pull1-2026-08-13");
    const pull2 = sessions.find((session) => session.id === "imported-pull2-2026-08-18");
    expect(new Set(pull1?.sets.map((set) => set.exerciseId)).size).toBe(10);
    expect(new Set(pull2?.sets.map((set) => set.exerciseId)).size).toBe(9);
  });
});
