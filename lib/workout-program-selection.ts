export const MAX_SELECTED_PROGRAMS = 5;

const MEMBER_TO_PROGRAM: Record<string, string> = {
  push1: "ppl",
  pull1: "ppl",
  legs1: "ppl",
  push2: "ppl",
  pull2: "ppl",
  legs2: "ppl",
  arms: "ppl",
  "ab-upper": "ab",
  "ab-lower": "ab",
  "abc-a": "abc",
  "abc-b": "abc",
  "abc-c": "abc",
  "abcd-a": "abcd",
  "abcd-b": "abcd",
  "abcd-c": "abcd",
  "abcd-d": "abcd",
  "full-body": "full-body",
};

export function canonicalProgramSelectionId(id: string): string {
  return MEMBER_TO_PROGRAM[id] ?? id;
}

export function toggleProgramSelection(current: string[], programId: string) {
  const canonicalId = canonicalProgramSelectionId(programId);
  const canonicalCurrent = normalizeSelectedProgramIds(current);

  if (canonicalCurrent.includes(canonicalId)) {
    return {
      selectedIds: canonicalCurrent.filter((id) => id !== canonicalId),
      selected: false,
      limitReached: false,
    };
  }

  if (canonicalCurrent.length >= MAX_SELECTED_PROGRAMS) {
    return {
      selectedIds: canonicalCurrent,
      selected: false,
      limitReached: true,
    };
  }

  return {
    selectedIds: [...canonicalCurrent, canonicalId],
    selected: true,
    limitReached: false,
  };
}

export function normalizeSelectedProgramIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const unique = new Set<string>();
  for (const valueItem of value) {
    if (typeof valueItem !== "string" || valueItem.length === 0) continue;
    unique.add(canonicalProgramSelectionId(valueItem));
    if (unique.size >= MAX_SELECTED_PROGRAMS) break;
  }
  return [...unique];
}
