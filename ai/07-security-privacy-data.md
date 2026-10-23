# 07: Security, privacy and data safety

Tipot is local-first and private. Losing or exposing a user's notes is the worst possible failure. Treat this file as the highest-priority rule set. Every item here is a **risk flag**: plan, then stop for approval.

## Data that must never change without a plan, a migration and a test
- Dexie database name and schema version; table and field names (including the `settings` singleton row and fields such as `pinSalt`, `pinHash`).
- Encryption: algorithms, key derivation inputs (salts, iterations, contexts, AAD), `encryptionVersion`, and anything under `src/lib/crypto/` or `src/lib/vault/`.
- The user-data folder path and any app/user-model IDs (`appId`).
- Backup/export formats and identifiers; the importer must always accept older backups.
- The Google Drive folder lookup and sync metadata.
- localStorage/IndexedDB keys.

## Rules
1. Never log, print, persist or transmit decrypted note content, PINs, keys or tokens. No sensitive data in error messages or analytics (there is no telemetry).
2. Migrations are additive and versioned (`version(n).upgrade`). They are tested from a fixture of the previous version. Before a destructive migration, create a safety copy.
3. Reverting code does not downgrade a user's database. A commit that bumps the schema carries a `Schema: vN -> vM` trailer, and is never reverted without checking this file.
4. Deletions go to trash first. Permanent deletion requires confirmation. Destructive bulk actions are never silent.
5. Encrypted notes: verify that search indexes, version history, exports, sync queues and logs never hold plaintext of protected notes unless the product explicitly documents it. Document what happens when the PIN is forgotten.
6. Secrets (`.env`, OAuth client IDs/secrets, signing certificates) are never committed or pasted into prompts. If a secret is exposed, stop and tell the user to rotate it.
7. IPC: validate every payload and sender in the main process; minimal API surface; no generic "run anything" channels. No `remote`, no `nodeIntegration`.
8. Content is never injected as raw HTML. Paste, import (including ENEX/HTML) and rendering go through sanitizers. Links open externally only for `http(s)`.
9. Network: only what the product needs (Drive sync, update check). Verify update integrity. Keep a content security policy.
10. Dependencies: justify, check license and maintenance, pin versions, run `npm audit` before releases.

## Observed differences and current facts
- Note encryption: AES-GCM-256; key derived with PBKDF2-SHA256, 100,000 iterations, from the vault password + salt (`src/lib/crypto/encryption.ts`). Encrypted payload stores base64 blob + iv + authTag + salt, `encryptionVersion: 1`.
- PIN: never stored. PBKDF2-SHA256 (100k iterations) hash + 16-byte salt per scope in the `settings` singleton (`pinSalt`/`pinHash` for the app, `vaultPinSalt`/`vaultPinHash` for the password manager); constant-time-ish comparison (`src/lib/utils/pin.ts`).
- What is encrypted (vault notes): title, content, plainTextContent, tags, folderId, color, attachments, pin/star/archive/delete flags. Not encrypted: note timestamps and the note's existence.
- Forgotten PIN: reset from Settings → Data; content of protected notes stays encrypted and is effectively lost (documented behavior).
- Electron: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `spellcheck: true`; `titleBarStyle: 'hidden'` + `titleBarOverlay` (48px). IPC handlers validate file paths under the backup directory; OAuth runs in the system browser with a loopback HTTP catch.
- CSP: no explicit content security policy is defined yet (`UNVERIFIED` whether the packaged build applies one) — worth adding.
- Plaintext: local backups and exports (JSON/ENEX/MD/HTML) are plaintext by design; the user chooses the folder.
- Storage: everything persists in IndexedDB (Dexie `NotesDB`); localStorage is not used for data (only the service-worker/PWA layer on the web build).
- User data folder: pinned to the legacy `My Notes` folder via `brand.json` + `app.setPath('userData', …)` at the very top of `electron/main.cjs` — do not remove.
