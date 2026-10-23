# 05: Architecture

Generated from the code (2026-10-07). Every statement is based on a file read; anything else is tagged `UNVERIFIED`.

## Process model
- Main: `electron/main.cjs` — window creation, IPC handlers, auto-update (electron-updater via GitHub Releases), local backup IO, import file picker, OAuth loopback catch.
- Preload: `electron/preload.cjs` — `contextBridge.exposeInMainWorld('electronAPI', …)`; the renderer's only bridge.
- Renderer: React 18 + TypeScript + Vite (`src/`), React Router, Dexie, TipTap, Excalidraw.
- Security: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, `spellcheck: true`; `titleBarStyle: 'hidden'` + `titleBarOverlay` (48px). No CSP defined (`UNVERIFIED` in packaged builds).
- User-data folder pinned to legacy `My Notes` via `brand.json` + `app.setPath('userData', …)` before other requires.

## Folder map
- `src/components/layout/` — Header (48px top bar), Sidebar (nav + notebooks + brand header), AccountMenuButton.
- `src/components/notes/` — NoteEditor (state, autosave, context menus, header actions), NoteList, NoteCard, ExportModal, VersionHistoryModal.
- `src/components/editor/` — TiptapEditor (editor + paste pipeline), EditorToolbar (docked toolbar, recorder), ResizableImageView, QuoteNodeView, VoiceMemoView, SlashIcons, Glyph.
- `src/components/whiteboards/` — WhiteboardPreview (note embeds).
- `src/components/reader/` — ReaderView (reader mode + annotations).
- `src/components/folders/` — FolderDialog (create/edit, cover image), NoteFoldersDialog.
- `src/components/security/` — PinPrompt (unlock/setup), VaultManager.
- `src/components/ui/` — ContextMenu (portal, keyboard nav), clipboard-menu, Modal, Toggle, Button…
- `src/lib/editor/` — extensions.ts (all TipTap nodes), paste.ts, quote.ts, whiteboard-preview-extension.tsx, voice-peaks.ts.
- `src/lib/db/` — database.ts (Dexie) + repositories (notes, folders, whiteboards, note-versions, vault).
- `src/lib/backup/` — backup-service (export/snapshot), import-service (JSON/ENEX/MD/HTML).
- `src/lib/sync/`, `src/lib/drive/` — Drive sync queue + API calls.
- `src/lib/theme/` — appearance.ts (accents/fonts/page colors), palette.ts (mark colors).
- `src/lib/reader/` — highlights.ts (annotation store).
- `src/lib/lock.ts` — app/vault session lock.
- `src/hooks/` — useNotes, useSearch, useSettings, useSync, useUiWidths + UiWidthsProvider, useIsDark, useWindowControlsInset, useDragResize.

## Dexie data model
Database `NotesDB`, schema version 4. Tables:
- `notes`: `id, folderId, createdAt, updatedAt, accessedAt, isDeleted, isPinned, isStarred, isArchived, syncStatus, driveFileId, *tags`
- `folders`: `id, parentId, driveFileId, syncStatus`
- `attachmentBlobs`: `id, noteId, driveFileId, cachedAt`
- `syncOperations`: `id, status, timestamp, entityId, [entityType+status]`
- `settings`: `id` (singleton `'singleton'` — tokens, PIN salts/hashes, Drive tokens, pane widths, editor prefs, shortcuts, backup config)
- `whiteboards`: `id, title, createdAt, updatedAt`
- `vault`: `id, title, updatedAt`
- `noteVersions`: `id, noteId, createdAt`
Migrations: additive `version(n).stores(...)` only (v1→v4 added whiteboards, vault, noteVersions).

## Data flows
- Note edit → `NoteEditor.onChange` → TiptapEditor `onUpdate` → content state → debounced `saveNow` (1s) → `noteService.updateNote` → Dexie (`syncStatus: 'pending'`) → sync queue → Drive (when connected).
- Search: `minisearch` index over notes (`useSearch`), queried via the `?search=` param.
- Trash/restore: `isDeleted` + `deletedAt`; restore clears them.
- Version history: snapshots in `noteVersions`; restore writes content back.
- Backup: JSON export (notes + folders) via the main process to a chosen folder; import accepts Tipot/legacy JSON, ENEX, MD, HTML through the sanitizer.
- Drive sync: operation queue in `syncOperations`; the remote root folder is named `My Notes` (identifier).
- Protected notes: content encrypted with AES-GCM-256 (PBKDF2-SHA256 100k key from the vault password); `isEncrypted` + blob/iv/authTag/salt on the note row.

## IPC contract (main ↔ renderer via preload)
| Channel | Direction | Payload → result |
|---|---|---|
| `titlebar:update` | renderer → main | `{color, symbolColor}` → bool |
| `edit:cut/copy/paste/pasteAndMatchStyle/selectAll` | renderer → main | void (native edit commands) |
| `clipboard:copyRich` | renderer → main | `(html, text)` → void |
| `backup:selectFolder` / `backup:write` / `backup:list` / `backup:read` / `backup:openFolder` | renderer → main | folder pick / write JSON / list `tipot-backup-*` + legacy / read / open |
| `import:openFile` | renderer → main | → `{name, path, text} \| null` |
| `app:update:check` / `app:update:install` | renderer → main | updater control |
| `google-auth:start` | renderer → main | `(authUrl, redirectUri)` → tokens (system browser + loopback catch) |
| `app:update:status` | main → renderer | `{state, info}` events |

## Storage keys
All app state lives in Dexie (`settings` singleton). localStorage is unused for data. Pane widths are CSS variables (`--sidebar-w`, `--list-w`) written during drag, committed to settings on pointer-up. `noteScrollMemory` is a session-only module Map.

## Theming
`applyAccent` writes OKLCH ramps (`--p-50…900` → Tailwind `primary-*`) plus `--brand`, `--brand-strong`, `--brand-text`, `--brand-soft`, `--on-brand` (contrast-picked). `applyPageColor` writes surface tokens (`--app-bg`, `--panel`, `--panel-soft`, `--surface-3`). Mark palette `--mark-*`. Dark mode via the `dark` class on `<html>`.

## Editor internals
Custom nodes: `image` (src/alt/width%/align/float, React view with corner resize), `whiteboardPreview` (boardId, width%), `voiceMemo` (dataUrl, duration, peaks, transcript), `inlineMath` (KaTeX), `videoEmbed`, `blockquote` extended with `bgColor` + trailing-paragraph plugin + quote-mark stripping. Paste pipeline (`resolvePaste`): Markdown → HTML, AI-app HTML cleaned, `allowBase64: true`. Reader mode: read-only render + SVG overlay annotations + CSS Custom Highlight API.

## Build / packaging
`npm run build` (tsc + vite, PWA service worker for web) · `npm run dist:win` (electron-builder NSIS, output `release-windows/Tipot-Setup-<version>.exe`) · publish GitHub Releases. `brand.json` + `build/icon.ico` ship inside the asar (see `build.files`).

## Testing
Vitest + Testing Library + fake-indexeddb. 43 tests / 12 files. Not covered: Electron main/preload, Drive network, Excalidraw canvas, audio playback.
