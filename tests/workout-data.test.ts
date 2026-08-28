import { describe, expect, it } from "vitest";
import { getTemplate, workoutTemplates } from "../lib/workout-data";
import { calculateVolume, createDemoCompletedSessions, mergeWorkoutSessions, normalizeWorkoutSessions, restoreActiveWorkout, sortWorkoutSessionsNewestFirst, type WorkoutSession } from "../lib/workout-store";
import { getAccountBackupStatus, requestAccountCloudBackup, setAccountBackupStatus, subscribeAccountBackupRequests, subscribeAccountBackupStatus } from "../lib/account-backup";

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

describe("אתחול נתוני אימונים", () => {
  it("משאיר משתמש חדש ללא יומני אימון", () => {
    expect(normalizeWorkoutSessions([])).toEqual([]);
  });

  it("שומר אימונים אישיים ומסיר רק רשומות דמו ישנות", () => {
    const personalSession: WorkoutSession = { id: "personal-session", templateId: "pull1", startedAt: "2026-08-22T18:00:00.000Z", sets: [] };
    const demoSession: WorkoutSession = { id: "demo-legacy", templateId: "legs1", startedAt: "2026-08-20T18:00:00.000Z", sets: [] };
    const sessions = normalizeWorkoutSessions([demoSession, personalSession]);
    expect(sessions).toEqual([personalSession]);
    expect(sortWorkoutSessionsNewestFirst([...sessions])[0]?.id).toBe("personal-session");
  });

  it("יוצר נתוני הדגמה מבודדים בלבד עם מזהים ייעודיים", () => {
    const sessions = createDemoCompletedSessions(workoutTemplates);
    expect(sessions).toHaveLength(3);
    expect(sessions.every((session) => session.id.startsWith("demo-"))).toBe(true);
    expect(sessions.every((session) => session.finishedAt === session.startedAt)).toBe(true);
    expect(sessions.every((session) => session.sets.every((set) => set.completed))).toBe(true);
  });

  it("משחזר אימון פעיל תקין אחרי רענון ומתעלם מנתון פגום", () => {
    const activeSession: WorkoutSession = {
      id: "pull2-active",
      templateId: "pull2",
      startedAt: "2026-08-25T20:15:00.000Z",
      sets: [{ id: "set-1", exerciseId: "pulldown", setNumber: 1, weight: "60", reps: "10", completed: true }],
    };
    expect(restoreActiveWorkout(JSON.stringify(activeSession))).toEqual(activeSession);
    expect(restoreActiveWorkout("{not-json")).toBeNull();
    expect(restoreActiveWorkout(JSON.stringify({ id: "incomplete" }))).toBeNull();
  });

  it("ממזג אימונים מהענן בלי למחוק אימון חדש מהמכשיר", () => {
    const localSession: WorkoutSession = { id: "local-new", templateId: "push1", startedAt: "2026-08-26T19:00:00.000Z", sets: [] };
    const cloudSession: WorkoutSession = { id: "cloud-old", templateId: "pull1", startedAt: "2026-08-25T19:00:00.000Z", sets: [] };
    expect(mergeWorkoutSessions([localSession], [cloudSession])).toEqual([localSession, cloudSession]);
  });
});

describe("גיבוי חשבון ידני", () => {
  it("מעדכן סטטוס ומבקש גיבוי ענן דרך ערוץ מבודד", () => {
    const statuses: string[] = [];
    const unsubscribeStatus = subscribeAccountBackupStatus((status) => statuses.push(status));
    let requested = 0;
    const unsubscribeRequest = subscribeAccountBackupRequests(() => { requested += 1; });
    setAccountBackupStatus("saved");
    requestAccountCloudBackup();
    expect(getAccountBackupStatus()).toBe("saved");
    expect(statuses).toContain("saved");
    expect(requested).toBe(1);
    unsubscribeStatus();
    unsubscribeRequest();
  });
});
