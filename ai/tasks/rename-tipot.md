# Rename to "Tipot" + New Icon: Safe Rollout Guide (for zcode / GLM)

Paste this whole file to the coding agent. Work through the phases in order. **The goal is a complete, visible rename and new icon everywhere, with zero change to anyone's data or to how the app behaves.**

> STATUS: APPLIED 2026-10-07 (Tipot-Setup-1.1.0.exe). Kept for reference. The upgrade test (§8.6) and manual steps (§10) are outstanding.

## 0. Inputs

```
OLD_NAME  = My Notes
NEW_NAME  = Tipot          (spelled T-I-P-O-T)
TAGLINE   = Your private writing space   (unchanged)
```

**Spelling warning (important):** the project's editor library is **Tiptap** (`@tiptap/*` packages, extensions, imports, docs). That is a different word and **must not be touched**. The new app name is **Tipot**: no "a". Never autocorrect one into the other, never rename any `tiptap` / `Tiptap` / `TipTap` string, import, package or comment. Before committing, check `git diff` and confirm that no line containing `tiptap` (any case) was changed.

### Icon files

New icon files were delivered with this guide and copied into the repo:

| Source file | Destination in repo | Used for |
|---|---|---|
| `brand/icon.ico` | `build/icon.ico` | Windows exe, installer, uninstaller, taskbar (contains 16, 24, 32, 48, 64, 128, 256px) |
| `brand/icon.png` (512px) | `build/icon.png` | electron-builder fallback, window icon in dev, README |
| `brand/icon-1024.png` | `build/icon-1024.png` | master copy / store listings |
| `brand/icon.svg` | `public/favicon.svg` and `src/assets/brand/icon.svg` | favicon, in-app large logo |
| `brand/favicon-32.png` | `public/favicon-32.png` | fallback favicon |
| `brand/mark.svg` | `src/assets/brand/mark.svg` | reference for the in-app mark (the component below inlines it) |

**The mark:** three stacked rounded stones (a cairn) drawn as layers. Top stone 70% opacity, middle 85%, bottom 100%, each slightly offset so it looks hand-balanced. White on a `#3761e1` rounded-square tile. Geometry on a 100x100 grid (also the source of truth if the icon must be regenerated):

| Stone | x | y | width | height | radius | opacity |
|---|---|---|---|---|---|---|
| Top | 36.4 | 22.4 | 32.2 | 15.0 | 7.5 | 0.70 |
| Middle | 22.0 | 40.8 | 52.9 | 16.1 | 8.0 | 0.85 |
| Bottom | 15.5 | 60.4 | 69.0 | 17.3 | 8.6 | 1.00 |

Tile: full 100x100, corner radius 22, fill `#3761e1`.

### Brand usage rules (put these in `docs/` or README)
- Write the name as **Tipot** (capital T, rest lowercase).
- Icon colors: blue `#3761e1` tile with white stones. Do not use fuchsia or orange as brand colors, and never style the name like "tip-tap".
- In the UI the mark inherits `currentColor` (no fixed colors).

---

## 1. Ground rules

1. **Do not touch user data paths, database names, storage keys, IPC channel names, encryption inputs, or file-format identifiers.** Section 3 lists them. When unsure whether a string is an identifier or a label, treat it as an identifier and leave it.
2. Work on a new branch: `git checkout -b rebrand-tipot`. Commit after each phase.
3. Small, targeted edits. No refactors, no reformatting, no dependency changes.
4. Change **display strings only**. Do not rename folders, files, components, CSS classes, variables or the repo.
5. After each phase run `npm run lint`, `npx tsc --noEmit`, `npm test`. Fix only what your change broke.
6. If an item looks risky or ambiguous, stop on that item, leave `// TODO(rebrand):` and list it in the final report. Do not guess.

---

## 2. Phase A: Baseline and audit (no code changes yet)

1. Run lint, tsc and tests. Record the results as the baseline.
2. Read `package.json`: `name`, `productName`, `version`, `description`, and the whole `build` block (`appId`, `productName`, `artifactName`, `win`, `nsis`, `publish`, `directories`, `extraMetadata`, `copyright`).
3. **Determine the current user-data folder name.** Electron uses `productName` if present, otherwise `name`. Check both the top-level and `build.productName`, and check `electron/main.cjs` for any existing `app.setName` / `app.setPath`. Write down the exact string; this is `LEGACY_USER_DATA_DIR` (typically `My Notes` or `my-notes`).
4. Search the repo (excluding `node_modules`, `release-windows`, `dist`, `.git`) for every spelling, case-insensitive: `my notes`, `my-notes`, `my_notes`, `mynotes`, `MyNotes`, `My-Notes`. Also search for the tagline text and for "My Notes" inside image/SVG text if any.
5. Create a temporary `RENAME_AUDIT.md` with a table: file, line, string, class (**DISPLAY**, **IDENTIFIER**, **UNSURE**), decision. Use section 3 to classify. Anything UNSURE is left unchanged.
6. Check `build.nsis.deleteAppDataOnUninstall`. It must be `false` or absent. If `true`, set it to `false` and mention it in the report (otherwise an upgrade could delete user data).

---

## 3. What to change and what to leave

### CHANGE (display strings)
- Sidebar logo text, window title, `<title>` in `index.html`
- `BrowserWindow` title option
- Settings footer and About text (for example "My Notes · Local-first · Your data stays yours")
- Empty states, onboarding, tooltips, dialogs, toasts, menu labels
- Tray tooltip and OS notification titles
- Updater messages
- Export/print HTML `<title>`, headers, and the **file-name prefix of new exports** (for example `Tipot-backup-<date>.json`)
- `build.productName`, `nsis.shortcutName`, `artifactName`, `copyright`, `package.json` `description`
- README, PROGRESS.md, AGENTS.md, docs/
- Tests that assert old display strings

### LEAVE UNCHANGED (identifiers)
- `build.appId` and any `AppUserModelId` (changing it breaks taskbar identity, update continuity and installer upgrade detection)
- `package.json` `name` (the npm id)
- **The user-data folder** (pinned in Phase C), the Dexie database name, table names, and localStorage/IndexedDB keys, even if they contain "mynotes"
- IPC channel names and preload API names
- **Anything under `src/lib/vault/`** that feeds encryption: salts, key-derivation contexts, AAD strings, key names. Changing these makes existing encrypted notes unreadable.
- **Google Drive sync:** the name used to find or create the remote folder, `appProperties`, and any lookup-by-name logic. Renaming it would orphan existing synced data or create a duplicate. You may only change a label shown in the UI.
- **Backup/export format identifiers** inside files (for example an `"app": "My Notes"` field or a magic header) and the **importer's validation**. The importer must keep accepting old backups. If you change anything the importer reads, make it accept both old and new values.
- Custom protocol / deep-link schemes (for example `mynotes://`) and file associations
- The GitHub `publish` owner/repo (do not rename the repo in this task)
- Every `tiptap` / `Tiptap` / `@tiptap/*` reference (the editor library)

---

## 4. Phase B: Central brand constants

Create one source of truth, so a future rename is a one-line change.

`brand.json` (repo root):

```json
{
  "name": "Tipot",
  "legacyName": "My Notes",
  "legacyUserDataDir": "<EXACT LEGACY_USER_DATA_DIR from Phase A>",
  "tagline": "Your private writing space"
}
```

- Renderer: `import brand from '../../brand.json'` (adjust the relative path). If TypeScript complains, set `"resolveJsonModule": true` in the renderer tsconfig.
- Replace hard-coded DISPLAY strings in the renderer with `brand.name` / `brand.tagline`.
- Main process: `const brand = require('../brand.json')` (path relative to `electron/main.cjs`).
- `index.html` `<title>`: write the literal new name (HTML can't import JSON).

---

## 5. Phase C: Electron main process, packaging and data safety (most important)

### C1. Pin the user-data folder FIRST, before changing any productName

Electron derives the data folder (IndexedDB, Local Storage, session data, logs, single-instance lock) from the app name. Changing `productName` would silently point the app at a new, empty folder, and users' notes would look deleted. Pin it to the legacy folder.

At the very top of `electron/main.cjs`, **before any other `require` that might read app paths** (electron-store, electron-log, electron-updater and similar) and before `app.whenReady()`:

```js
const { app } = require('electron')
const path = require('node:path')
const brand = require('../brand.json')

// DO NOT CHANGE: keeps existing user data after the rename (see PROGRESS.md Decisions).
app.setPath('userData', path.join(app.getPath('appData'), brand.legacyUserDataDir))
```

Rules:
- Remove or reorder any earlier code that calls `app.getPath('userData')` before this line.
- Do not call `app.setName()` before this line.
- Do not delete or move any data folder.

### C2. Packaging config (`package.json` `build` block)

- `appId`: **unchanged**.
- `productName`: `Tipot` (also the top-level `productName` if present).
- `artifactName`: `Tipot-Setup-${version}.${ext}` (keep the existing pattern, hyphens, no spaces).
- `nsis.shortcutName`: `Tipot` (only if the key exists; otherwise leave the default).
- `nsis.deleteAppDataOnUninstall`: `false`.
- Icons: `win.icon` = `build/icon.ico`; `nsis.installerIcon`, `nsis.uninstallerIcon`, `nsis.installerHeaderIcon` (only if present or already used) = `build/icon.ico`. If no icon keys exist, electron-builder picks up `build/icon.ico` and `build/icon.png` automatically, so leave it that way.
- `copyright`, `description`: new name.
- `publish`: unchanged.

### C3. Window and runtime

- `BrowserWindow`: `title: brand.name` and `icon: path.join(__dirname, '../build/icon.ico')` (use `icon.png` if there is a non-Windows dev branch).
- Tray (if any): new icon and tooltip.
- If `app.setAppUserModelId(...)` exists, leave its value unchanged.
- Auto-launch / login-item registration (if any): check what name it registers under. Keep the existing registration working without creating a duplicate entry, and note it in the report.
- Update messages: new name.

---

## 6. Phase D: New icon in the renderer

1. Copy assets per section 0.
2. `index.html`:

```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
<title>Tipot</title>
```

3. Create `src/components/brand/BrandMark.tsx` (inline SVG so it follows theme colors):

```tsx
export function BrandMark({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="currentColor"
         className={className} aria-hidden="true">
      <rect x="36.4" y="22.4" width="32.2" height="15" rx="7.5" opacity=".7" />
      <rect x="22" y="40.8" width="52.9" height="16.1" rx="8" opacity=".85" />
      <rect x="15.5" y="60.4" width="69" height="17.3" rx="8.6" />
    </svg>
  )
}
```

4. **Sidebar logo:** find the current logo tile (search for the document-style icon beside the app name). Replace the icon inside it with `<BrandMark size={18} />`. Tile styling: 24-28px square, `border-radius: 6px`, `background: var(--brand-soft)`, mark color `var(--brand-text)`. In the collapsed rail show the tile only. Do **not** change the "All notes" navigation icon (it correctly stays a document icon); the logo must be visibly different from it.
5. Replace other places that show the old app icon (About dialog, empty states, splash/loading, onboarding) with `BrandMark` or the new PNG.
6. Do not change colors or tokens elsewhere.

---

## 7. Phase E: Docs, tests and rename guard

1. Update `README.md`, `PROGRESS.md`, `AGENTS.md` and `docs/` to the new name. In `PROGRESS.md`:
   - The header and section 1 ("What this project is") use **Tipot**.
   - Add to **Decisions**: `User-data folder is pinned to the legacy folder "<LEGACY_USER_DATA_DIR>" via brand.json, because changing productName would otherwise point the app at an empty data folder.`
   - Add to **Decisions**: `appId, DB names, storage keys, vault inputs, Drive folder lookup and backup format identifiers keep their original values on purpose.`
   - Add to **Decisions**: `Name is "Tipot" (not "Tiptap", which is the editor library). Icon is the cairn-layers mark.`
   - Add one line to **Recent major changes**: `YYYY-MM-DD · Renamed app to Tipot, new cairn-layers icon, brand.json, userData pinned · Verified: <what you ran>`.
2. Update tests that assert the old display name.
3. Add a guard test `src/__tests__/rename-guard.test.ts` so the old display name doesn't creep back (see the bootstrap guide for the shape; allowlist the identifier files).
4. Delete `RENAME_AUDIT.md` after summarizing it in the final report.

---

## 8. Phase F: Verification (all required)

1. `npm run lint` (zero warnings), `npx tsc --noEmit`, `npm test` all pass.
2. `git diff` shows no changes to any line containing `tiptap` (any case) or `@tiptap/`.
3. `npm run desktop`: check the window title, sidebar logo (tile and collapsed rail), settings footer, empty state, in light and dark themes.
4. In dev, log `app.getPath('userData')` once and confirm it equals the legacy folder from Phase A. Remove the log.
5. `npm run dist:win`: confirm the installer is named `Tipot-Setup-<version>.exe`, and that the exe, installer and taskbar show the new icon, readable at small sizes.
6. **Upgrade test (critical).** On a machine with the *old* installed version containing real notes (a protected/encrypted note, a folder, an image, and Drive sync if used):
   - Install the new build over it.
   - Confirm all notes, folders and images are present; the encrypted note unlocks with the same PIN; Drive sync is still connected with no duplicate remote folder; pane widths and theme settings are preserved; version history is intact.
   - Confirm Windows Settings > Apps shows **one** entry (Tipot) and the old install is gone. If two entries appear, report it; do **not** delete any data folders.
   - Confirm importing an **old** backup file still works.
7. Auto-update: confirm the generated `latest.yml` references the new installer name consistently.

---

## 9. Expected one-time effects (not bugs)

- A pinned taskbar or desktop shortcut for the old exe name may need re-pinning once.
- Windows may list the new name as a new app in notification settings.

## 10. Manual steps for the user (cannot be done in code)

- Google Cloud Console: update the OAuth consent screen app name and logo (if Drive sync uses OAuth).
- GitHub: repo description and README image. Do not rename the repo until you've tested update continuity.
- Any website, store listing or domain.
- **Naming clearance before public distribution:** "Tipot" is close to "Tiptap", whose owner (Tiptap GmbH) holds trademark registrations for that name, and this app is built on their editor. Do a formal trademark search (Nepal Department of Industry, WIPO Global Brand Database, USPTO, EUIPO) if you plan to distribute or sell it publicly. Keep the app's visuals clearly different from Tiptap's (no fuchsia/orange, no "tip-tap" styling).

## 11. Rollback

If anything fails the upgrade test: `git checkout main`, rebuild the previous version, and reinstall. User data is untouched because this change moves or deletes no data folder.

## 12. Final report (max 15 lines)

Branch and commits · files changed per phase · identifiers deliberately left unchanged (with reasons) · LEGACY_USER_DATA_DIR value found · confirmation that no `tiptap` lines changed · verification results (lint/tsc/tests and the upgrade test) · anything skipped or UNSURE · docs updated.
