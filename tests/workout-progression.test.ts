import { describe, expect, it } from "vitest";
import { calculateFivePercentProgress } from "../lib/workout-progression";

describe("automatic 5% progression", () => {
  it("raises available weight and rounds to a practical half kilogram", () => {
    expect(calculateFivePercentProgress({ weight: "100", reps: "8" })).toEqual({ value: "105", mode: "weight" });
  });

  it("raises repetitions when no previous weight exists", () => {
    expect(calculateFivePercentProgress({ weight: "", reps: "10" })).toEqual({ value: "11", mode: "reps" });
  });

  it("returns no progression when the previous set has no numeric data", () => {
    expect(calculateFivePercentProgress({ weight: "", reps: "מקסימום" })).toBeNull();
  });
});
