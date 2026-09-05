/**
 * True only when this device's cached local data is known to belong to a
 * different, previously signed-in account and there is no cloud snapshot
 * yet for the account signing in now - the exact condition under which a
 * shared/reused device would otherwise leak one user's workout data into
 * another's. A never-used device (storedOwnerId is null) or the same
 * account signing back in must never trigger a reset. Used by
 * components/account-sync.tsx.
 */
export function shouldResetLocalAccountCache(params: {
  storedOwnerId: string | null;
  currentAccountId: string;
  hasCloudSnapshot: boolean;
}): boolean {
  if (params.hasCloudSnapshot) return false;
  return Boolean(params.storedOwnerId) && params.storedOwnerId !== params.currentAccountId;
}
