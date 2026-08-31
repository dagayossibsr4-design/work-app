import { describe, expect, it } from "vitest";

import { MAX_SELECTED_PROGRAMS, normalizeSelectedProgramIds, toggleProgramSelection } from "../lib/workout-program-selection";

describe("workout program selection", () => {
  it("adds programs until the five-program limit", () => {
    let selected: string[] = [];
    for (const id of ["ppl", "ab", "abc", "abcd", "powerlifting-big-3"]) {
      const result = toggleProgramSelection(selected, id);
      selected = result.selectedIds;
      expect(result.selected).toBe(true);
      expect(result.limitReached).toBe(false);
    }
    const blocked = toggleProgramSelection(selected, "crossfit-wod");
    expect(selected).toHaveLength(MAX_SELECTED_PROGRAMS);
    expect(blocked.limitReached).toBe(true);
    expect(blocked.selectedIds).toEqual(selected);
  });

  it("removes a selected program and normalizes persisted values", () => {
    const removed = toggleProgramSelection(["ppl", "ab"], "ab");
    expect(removed.selectedIds).toEqual(["ppl"]);
    expect(normalizeSelectedProgramIds(["ppl", "", 4, "ab", "abc", "abcd", "powerlifting-big-3", "extra"])).toEqual(["ppl", "ab", "abc", "abcd", "powerlifting-big-3"]);
  });
});
