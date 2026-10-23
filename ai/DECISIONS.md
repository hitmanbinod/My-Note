# Decisions (append-only; newest at the bottom)

Format:
### YYYY-MM-DD: <title>
Context: <why this came up>
Decision: <what was chosen>
Reason: <why, and what was rejected>
Consequences: <what this constrains or requires>

---
### 2026-10-06: Image width stored as a percentage of content width
Context: Panes are resizable, so pixel widths go stale.
Decision: The image node stores `width` as a percentage; alignment as `align` left/center/right with a `float` flag.
Reason: Percentages track pane and column resizing without migration.
Consequences: Resize code converts pointer pixels to percent on commit.

### 2026-10-06: Pane widths are CSS variables written during drag
Context: React re-renders per pointer move made dragging janky.
Decision: `useDragResize` writes `--sidebar-w` / `--list-w` on `<html>` during drag; settings are committed once on pointer-up.
Reason: Zero re-renders while dragging.
Consequences: Nothing may transition pane widths during a drag; persist via the settings row.

### 2026-10-06: `--on-brand` computed from contrast
Context: Fixed white text failed contrast on light accents (pink in dark mode was ~2.4:1).
Decision: `pickOnBrand(brandHex)` picks dark or white by WCAG relative luminance; applied as `--on-brand` in `applyAccent`.
Reason: Readable text on every accent in both themes.
Consequences: Solid brand fills must use `var(--on-brand)`, never `text-white`.

### 2026-10-07: User-data folder pinned to the legacy folder after the rename to Tipot
Context: Renaming the app (productName "My Notes" → "Tipot") would point Electron at a new, empty data folder.
Decision: `electron/main.cjs` calls `app.setPath('userData', path.join(app.getPath('appData'), brand.legacyUserDataDir))` before anything reads app paths; `brand.json` carries `legacyUserDataDir: "My Notes"`.
Reason: Existing users keep their notes across the rename.
Consequences: Never remove the pin; the packaged folder stays "My Notes" even though the app is Tipot.

### 2026-10-07: Identifiers intentionally keep legacy values after the rebrand
Context: The Tipot rename could break backups, sync and packaging identity.
Decision: `appId` (`com.mynote.app`), npm package `name`, Dexie database/table names, storage keys, vault encryption inputs, the Drive remote folder name ("My Notes"), the whiteboard scene `source: 'my-notes'` and the in-file backup `app: 'my-notes'` identifier stay unchanged; new local backup files use the `tipot-backup-` prefix and both prefixes are accepted everywhere.
Reason: Changing identifiers orphans user data, sync history and upgrade detection.
Consequences: The rename guard test allows these legacy strings only in their identifier files.

### 2026-10-07: Settings live in a single Dexie row
Context: Preferences, tokens and security material need one durable place.
Decision: All settings persist in the `settings` table, singleton row id `'singleton'` (Google tokens, PIN salts/hashes, theme/accent/page color, pane widths, editor prefs, shortcuts, backup config).
Reason: One read on startup, one write on change.
Consequences: Writes to any preference touch the same row; keep writes field-scoped (`db.settings.update('singleton', { field })`).

### 2026-10-07: App is Windows-only
Context: Installer, title bar overlay and packaging target Windows.
Decision: Windows is the only supported platform (NSIS installer, Windows-style title bar overlay).
Reason: Scope control for a single-developer product.
Consequences: macOS/Linux code paths are not tested; do not promise them.
