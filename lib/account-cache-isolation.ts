/**
 * True whenever this device's cached local data cannot be positively
 * confirmed to belong to the account now signing in, and there is no cloud
 * snapshot yet to restore from instead. A device is only ever trusted when
 * its stored owner marker is an exact match for the current account - a
 * missing marker is treated the same as a mismatched one, not as "safe",
 * because every device that used the app before this marker existed (any
 * shared/reused browser included) has no marker at all, yet may already
 * hold a *different* account's cached data. Trusting an absent marker was
 * exactly the gap that let an already-contaminated device keep leaking a
 * previous account's workout data into the next account signing in on it,
 * even after this reset mechanism shipped. Used by components/account-sync.tsx.
 */
export function shouldResetLocalAccountCache(params: {
  storedOwnerId: string | null;
  currentAccountId: string;
  hasCloudSnapshot: boolean;
}): boolean {
  if (params.hasCloudSnapshot) return false;
  return params.storedOwnerId !== params.currentAccountId;
}
