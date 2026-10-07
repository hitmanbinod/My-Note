/**
 * Session-scoped lock state. Two independent locks: the app lock (locked
 * notes/folders) and the password-vault lock. Both start locked on launch.
 */
function createLock() {
  let unlocked = false;
  let listeners: Array<(value: boolean) => void> = [];
  return {
    isUnlocked: () => unlocked,
    unlock() {
      if (unlocked) return;
      unlocked = true;
      listeners.forEach((fn) => fn(unlocked));
    },
    lock() {
      if (!unlocked) return;
      unlocked = false;
      listeners.forEach((fn) => fn(unlocked));
    },
    subscribe(fn: (value: boolean) => void) {
      listeners.push(fn);
      fn(unlocked);
      return () => {
        listeners = listeners.filter((l) => l !== fn);
      };
    }
  };
}

const appLock = createLock();
export const vaultLock = createLock();

export function isUnlocked(): boolean {
  return appLock.isUnlocked();
}
export function unlockSession(): void {
  appLock.unlock();
}
export function lockSession(): void {
  appLock.lock();
}
export function subscribeLock(fn: (value: boolean) => void): () => void {
  return appLock.subscribe(fn);
}

export function isVaultUnlocked(): boolean {
  return vaultLock.isUnlocked();
}
export function unlockVault(): void {
  vaultLock.unlock();
}
export function lockVault(): void {
  vaultLock.lock();
}
export function subscribeVaultLock(fn: (value: boolean) => void): () => void {
  return vaultLock.subscribe(fn);
}
