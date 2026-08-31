import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Serializes grouped AsyncStorage writes. This prevents overlapping persistence
 * effects from finishing out of order and restoring an older meal snapshot.
 */
let pendingWrite: Promise<void> = Promise.resolve();

export function enqueueAsyncStorageMultiSet(entries: [string, string][]) {
  const nextWrite = pendingWrite.then(() => AsyncStorage.multiSet(entries));
  pendingWrite = nextWrite.catch(() => undefined);
  return nextWrite;
}

export function enqueueAsyncStorageSet(key: string, value: string) {
  const nextWrite = pendingWrite.then(() => AsyncStorage.setItem(key, value));
  pendingWrite = nextWrite.catch(() => undefined);
  return nextWrite;
}

export function enqueueAsyncStorageRemove(key: string) {
  const nextWrite = pendingWrite.then(() => AsyncStorage.removeItem(key));
  pendingWrite = nextWrite.catch(() => undefined);
  return nextWrite;
}
