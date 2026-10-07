import { db } from '@/lib/db/database';

/**
 * 4-digit PIN hashing with PBKDF2-SHA256 (100k iterations, random salt).
 * Only the salt + hash are stored — the PIN itself never persists.
 *
 * Two independent PINs exist: the app PIN (locked folders) and the optional
 * password-manager PIN. The vault falls back to the app PIN when no separate
 * one is set (verifyVaultAccess).
 */
const ITERATIONS = 100_000;

export type PinScope = 'app' | 'vault';

const FIELDS: Record<PinScope, { salt: 'pinSalt' | 'vaultPinSalt'; hash: 'pinHash' | 'vaultPinHash' }> = {
  app: { salt: 'pinSalt', hash: 'pinHash' },
  vault: { salt: 'vaultPinSalt', hash: 'vaultPinHash' }
};

async function deriveBits(pin: string, salt: Uint8Array): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(pin), 'PBKDF2', false, ['deriveBits']);
  return crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt.buffer as ArrayBuffer, iterations: ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256
  );
}

const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromBase64 = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
const toHex = (buffer: ArrayBuffer) => [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');

export function isValidPinFormat(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

/** Stores a new PIN (or replaces the existing one) for the given scope. */
export async function savePin(pin: string, scope: PinScope = 'app'): Promise<void> {
  if (!isValidPinFormat(pin)) throw new Error('PIN must be exactly 4 digits');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = toHex(await deriveBits(pin, salt));
  await db.settings.update('singleton', { [FIELDS[scope].salt]: toBase64(salt), [FIELDS[scope].hash]: hash });
}

export async function verifyPin(pin: string, scope: PinScope = 'app'): Promise<boolean> {
  const settings = await db.settings.get('singleton');
  const saltB64 = scope === 'app' ? settings?.pinSalt : settings?.vaultPinSalt;
  const hashHex = scope === 'app' ? settings?.pinHash : settings?.vaultPinHash;
  if (!saltB64 || !hashHex) return false;
  try {
    const salt = fromBase64(saltB64);
    const hash = toHex(await deriveBits(pin, salt));
    // Constant-time-ish comparison
    if (hash.length !== hashHex.length) return false;
    let mismatch = 0;
    for (let i = 0; i < hash.length; i++) {
      mismatch |= hash.charCodeAt(i) ^ hashHex.charCodeAt(i);
    }
    return mismatch === 0;
  } catch {
    return false;
  }
}

export async function hasPin(scope: PinScope = 'app'): Promise<boolean> {
  const settings = await db.settings.get('singleton');
  if (scope === 'app') return Boolean(settings?.pinHash && settings?.pinSalt);
  return Boolean(settings?.vaultPinHash && settings?.vaultPinSalt);
}

export async function clearPin(scope: PinScope = 'app'): Promise<void> {
  if (scope === 'app') {
    await db.settings.update('singleton', { pinSalt: null, pinHash: null });
  } else {
    await db.settings.update('singleton', { vaultPinSalt: null, vaultPinHash: null });
  }
}

/**
 * Gate for the password manager reveal: honor the dedicated vault PIN when
 * one is set, otherwise fall back to the app PIN.
 */
export async function verifyVaultAccess(pin: string): Promise<boolean> {
  if (await hasPin('vault')) return verifyPin(pin, 'vault');
  return verifyPin(pin, 'app');
}
