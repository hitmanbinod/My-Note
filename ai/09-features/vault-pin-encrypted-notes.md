# Vault Pin Encrypted Notes.Md

**Purpose:** Protect notes with a PIN and store secrets in an encrypted vault.

**Key files:** src/components/security/PinPrompt.tsx, VaultManager.tsx, src/lib/utils/pin.ts, src/lib/crypto/encryption.ts, src/lib/vault/, src/lib/lock.ts.

**Data:** settings: pinSalt/pinHash (app scope), vaultPinSalt/vaultPinHash (vault scope); vault table; encrypted note fields (blob/iv/authTag/salt, encryptionVersion).

**How it works:**
1. Setup: 4-digit PIN → PBKDF2-SHA256 100k → salt+hash (PIN never stored). 2. Unlock: session (app) or vault unlock; search+Enter unlocks the vault without a second prompt. 3. Encrypt/decrypt on save/open for protected notes.

**Invariants / do-not-break rules:** Never store or log the PIN or plaintext keys; constant-time-ish hash compare; forgotten PIN = reset from Settings (protected content stays encrypted).

**Edge cases and gotchas:** PinInput clamps to 4 digits; makeQuote-style helpers must never touch PIN fields.

**Tests:** Pin and crypto round-trip tests exist (pin.ts, encryption). Missing: forgotten-PIN flow test.

**Known issues:** None known.

**Open questions:** None.
