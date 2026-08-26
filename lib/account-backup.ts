export type AccountBackupStatus = "idle" | "saving" | "saved" | "failed" | "sign-in" | "unavailable";

let currentStatus: AccountBackupStatus = "idle";
const statusListeners = new Set<(status: AccountBackupStatus) => void>();
const backupRequestListeners = new Set<() => void>();

export function getAccountBackupStatus() {
  return currentStatus;
}

export function setAccountBackupStatus(status: AccountBackupStatus) {
  currentStatus = status;
  statusListeners.forEach((listener) => listener(status));
}

export function subscribeAccountBackupStatus(listener: (status: AccountBackupStatus) => void) {
  listener(currentStatus);
  statusListeners.add(listener);
  return () => {
    statusListeners.delete(listener);
  };
}

export function requestAccountCloudBackup() {
  backupRequestListeners.forEach((listener) => listener());
}

export function subscribeAccountBackupRequests(listener: () => void) {
  backupRequestListeners.add(listener);
  return () => {
    backupRequestListeners.delete(listener);
  };
}
