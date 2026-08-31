export const MAX_SELECTED_PROGRAMS = 5;

export function toggleProgramSelection(current: string[], programId: string) {
  if (current.includes(programId)) {
    return {
      selectedIds: current.filter((id) => id !== programId),
      selected: false,
      limitReached: false,
    };
  }

  if (current.length >= MAX_SELECTED_PROGRAMS) {
    return {
      selectedIds: current,
      selected: false,
      limitReached: true,
    };
  }

  return {
    selectedIds: [...current, programId],
    selected: true,
    limitReached: false,
  };
}

export function normalizeSelectedProgramIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((id): id is string => typeof id === "string" && id.length > 0)
    .slice(0, MAX_SELECTED_PROGRAMS);
}
