import { beforeEach, describe, expect, it, vi } from "vitest";

const writes: string[] = [];

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    multiSet: vi.fn(async (entries: [string, string][]) => {
      writes.push(entries[0]?.[1] ?? "");
      await new Promise((resolve) => setTimeout(resolve, 1));
    }),
    setItem: vi.fn(async () => undefined),
    removeItem: vi.fn(async () => undefined),
  },
}));

import { enqueueAsyncStorageMultiSet } from "../lib/storage-write-queue";

describe("serialized nutrition storage writes", () => {
  beforeEach(() => {
    writes.length = 0;
  });

  it("keeps grouped writes in enqueue order", async () => {
    const first = enqueueAsyncStorageMultiSet([["meal-plan-state", "old"]]);
    const second = enqueueAsyncStorageMultiSet([["meal-plan-state", "new"]]);

    await Promise.all([first, second]);

    expect(writes).toEqual(["old", "new"]);
  });
});
