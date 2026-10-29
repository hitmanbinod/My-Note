# Tipot: Project Guide

Rules: AGENTS.md · Deep guides: ai/README.md · Decisions: ai/DECISIONS.md

Updated: 2026-10-07 · App version: 1.1.0 · Platform: Windows only (Electron 32)

**How to use this file:** read sections 1-4 first. Then read only the section(s) a task needs:
UI work → 5, 6 · data/sync/vault → 4, 7 · build/release → 8 · anything risky → 9.
Rules for editing this file are in AGENTS.md. This file describes the present; it is edited in place.

## 1. What this project is

Tipot is a private, local-first notes and whiteboard app for Windows. Notes are rich text and live on the
user's machine; nothing leaves it unless the user turns on Google Drive sync. Goals: fast, private, minimal and
professional UI (UpNote-like feel). Non-goals: web/mobile version, real-time collaboration.
Audience: single user, personal use (distributed via GitHub Releases).
Update when: scope, goals or platforms change.

## 2. Feature inventory

| Area | What exists | State |
|---|---|---|
| Notes | CRUD, autosave, notebooks (folders), tags, pin, star, trash/archive, search, sort menu, instant warm opens + per-note scroll restore | done |
| Editor | TipTap v2 rich text, slash menu, tables, code blocks, paste pipeline, resizable images with float/wrap + alt-text popover, quote blocks (upright, no quote marks, ·· menu, trailing paragraph), highlight paint mode (latch + cursor + drag-apply), voice-memo pill player (48-bar dual-layer waveform, real peaks, rAF progress) | done (verified 2026-10-07) |
| Embeds | Whiteboard (Excalidraw) previews inside notes; images and boards get a ·· options button; images resize via an invisible corner drag zone, boards via a circular grip | done |
| Whiteboards | Standalone boards; back button returns to the originating note (deep links fall back to the list) | done |
| Reader mode | Pen / highlighter (real-time drag) / text / eraser annotations, highlights (CSS Highlight API), sticky notes | done |
| Version history | Per-note snapshots, restore | done |
| Security | 4-digit PIN lock (app + separate vault PIN), encrypted vault for protected notes | done |
| Sync | Optional Google Drive sync queue | done |
| Backup | Export/import: JSON, ENEX, MD, HTML; local backup folders | done |
| Updates | Auto-update from GitHub Releases (electron-updater) | done |
| Theming | OKLCH accent ramps (12 accents), 6 page colors (theme-reactive swatches), light/dark/system, font + size settings | done (verified 2026-10-07) |
| Layout | Collapsible sidebar (icon rail), resizable sidebar + list, 48px merged title bar, Tipot brand header, create/settings/account in the top bar | done (verified 2026-10-07) |
| Notebooks | Cover image or gradient, lock, color, create/edit via FolderDialog (+ rail quick-add) | done (verified 2026-10-07) |
Update when: a feature is added, removed or changes state.

## 3. Tech stack

React 18 + TypeScript + Vite (renderer) · Tailwind (tokens in `src/index.css`) · TipTap v2 · Excalidraw 0.18 ·
Dexie 4 (IndexedDB) · Electron 32 (`electron/main.cjs`, `electron/preload.cjs`) · electron-builder (NSIS) ·
Vitest + Testing Library · ESLint (`--max-warnings 0`). Other libs: dexie-react-hooks, minisearch (search),
lowlight/katex (code + math), turndown/marked (paste/import), jszip, electron-updater.
Update when: a dependency of note is added or its major version changes.

## 4. Architecture

**Processes:** main (window, IPC, updates, file dialogs) · preload (exposes `window.electronAPI` via
contextBridge) · renderer (React app). Electron hardening: `contextIsolation: true`, `nodeIntegration: false`,
`sandbox: true`, `spellcheck: true`; window uses `titleBarStyle: 'hidden'` + `titleBarOverlay` (48px).

**Folder map**
```
src/components/notes/        NoteEditor (editor + context menus), NoteList, NoteCard
src/components/editor/       EditorToolbar, TiptapEditor (paste pipeline), ResizableImageView, QuoteNodeView, SlashIcons
src/components/whiteboards/  WhiteboardPreview; src/pages/WhiteboardEditorPage.tsx
src/components/reader/       ReaderView.tsx (annotations)
src/components/folders/      FolderDialog (cover image, lock), NoteFoldersDialog; src/services/FolderService.ts
src/components/security/     PinPrompt, VaultManager; src/lib/vault/ encryption
src/components/ui/           ContextMenu, clipboard-menu (editCommands), Modal, Toggle…
src/components/layout/       Header (48px bar), Sidebar, AccountMenuButton
src/lib/editor/              extensions.ts (all TipTap nodes), paste.ts, quote.ts, whiteboard-preview-extension.tsx
src/lib/db/                  database.ts (Dexie) + one repository per table
src/lib/sync/, src/lib/drive/ Google Drive sync queue
src/lib/backup/              export/import services
src/lib/theme/appearance.ts  ACCENTS, FONTS, PAGE_COLORS, pickOnBrand, applyAccent/applyFont/applyPageColor
src/hooks/                   useUiWidths.tsx + UiWidthsProvider.tsx (resizable panes), useSettings, useNotes…
```

**Data model (Dexie):** db name `NotesDB`, current schema version **4**. Tables:
- `notes`: `id, folderId, createdAt, updatedAt, accessedAt, isDeleted, isPinned, isStarred, isArchived, syncStatus, driveFileId, *tags`
- `folders`: `id, parentId, driveFileId, syncStatus`
- `attachmentBlobs`: `id, noteId, driveFileId, cachedAt`
- `syncOperations`: `id, status, timestamp, entityId, [entityType+status]`
- `settings`: `id` (single row `'singleton'` — all prefs, Google tokens, PIN salts/hashes, backup config)
- `whiteboards`: `id, title, createdAt, updatedAt`
- `vault`: `id, title, updatedAt`
- `noteVersions`: `id, noteId, createdAt`

Migrations: additive `version(n).stores(...)` blocks in `database.ts`; no data rewrites so far.

**How a note is saved:** editor change → `onChange` in NoteEditor → `debounce(saveNow, 1000)` →
`noteService.updateNote/createNote` → `notes.repository` → Dexie (`syncStatus: 'pending'`) → sync queue → Drive.
Creating a note from a folder view takes `routeFolderId` from the current route.

**Encrypted notes (vault):** note secrets — title, content, plainTextContent, tags, folderId, color,
attachments, pin/star/archive/delete flags — are serialized and encrypted with AES-GCM-256; the key is derived
with PBKDF2-SHA256 (100k iterations) from the vault password + salt (see `src/lib/crypto/encryption.ts`). The
encrypted blob, iv, authTag and salt are base64 fields on the encrypted note (`encryptionVersion: 1`).
The PIN itself is never stored: PBKDF2-SHA256 (100k) hash + 16-byte salt in the settings row, one pair per
scope (`pinSalt/pinHash` for the app, `vaultPinSalt/vaultPinHash` for the password manager). Forgotten PIN:
reset from Settings (Data section) — content stays.

**IPC contract** (renderer ↔ main; keep this table complete)

| Channel | Direction | Payload → result | Purpose |
|---|---|---|---|
| `titlebar:update` | renderer → main | `{color, symbolColor}` → bool | recolor the native window buttons on theme change (Windows overlay) |
| `edit:cut` / `edit:copy` / `edit:paste` / `edit:pasteAndMatchStyle` / `edit:selectAll` | renderer → main | void | native edit commands on the focused element |
| `clipboard:copyRich` | renderer → main | `(html, text)` → void | rich copy fallback for Electron |
| `backup:selectFolder` / `backup:write` / `backup:list` / `backup:read` / `backup:openFolder` | renderer → main | see preload.cjs | local backups |
| `import:openFile` | renderer → main | → `{name, path, text} \| null` | import file picker |
| `app:update:check` / `app:update:install` | renderer → main | see preload.cjs | electron-updater |
| `google-auth:start` | renderer → main | `(authUrl, redirectUri)` → tokens | OAuth via system browser + loopback catch |

**Storage keys:** everything persists in Dexie (`settings` row `'singleton'`) — `sidebarWidth`, `listWidth`,
`theme`, `accentColor`, `pageColor`, `editorFont`, `editorFontSize`, `editorLineHeight`, `shortcuts`,
`toolbarOrder`, `splitView`, `focusMode`, `typewriterMode`, `pinSalt/pinHash`, `vaultPinSalt/vaultPinHash`,
Google tokens and Drive folder ids. No localStorage keys. Pane widths are CSS variables (`--sidebar-w`,
`--list-w`) written on `:root` during drag and committed to settings on pointer-up.

**Theming:** accent chosen in Settings → `applyAccent` writes `--p-50…900`, `--brand`, `--brand-strong`,
`--brand-text`, `--brand-soft`, `--on-brand` (text color picked by contrast via `pickOnBrand`, so it is
readable on every accent) → page-color presets write surface tokens (`--app-bg`, `--panel`, `--panel-soft`,
`--surface-3`). Light/dark via the `dark` class on `<html>`.

**Editor internals:** custom nodes — `image` (attrs: src, alt, width as %, align left/center/right, float
bool for text wrap), `whiteboardPreview` (boardId, width %), `voiceMemo` (dataUrl, duration, transcript),
`inlineMath` (tex), `videoEmbed` (src), `blockquote` extended with `bgColor` + a ·· node view. Paste pipeline
in TiptapEditor (`resolvePaste`): markdown → HTML, AI-app HTML cleaned; `allowBase64: true` so pasted data-URI
images parse. Reader mode renders the note read-only with an SVG annotation overlay + CSS Highlight API.

**Layout rules:** sidebar 56-420px (default 260; below 140 collapses to a 56px rail), list 260-480px (default
320), editor content capped at 720px anchored left, top bar 48px with the native window buttons overlaid.
Create (note/whiteboard), split view, settings and account live in the top bar's right side.
Update when: any of these structures, contracts or keys change.

## 5. Design system

- Tokens only: no hard-coded hex in components. Surfaces: top bar/sidebar `--app-bg`; list/editor `--panel`;
  hover/menus `--panel-soft` / `--surface-3`; lines `--line` / `--line-strong`; text `--ink` / `--muted`.
- Accent budget: `--brand` only on the active nav item, selected row edge+tint, focus rings, links/toggles and
  the New-note icon states. Text on solid brand fills is `--on-brand`.
- Type scale for chrome: 11 / 11.5 / 12 / 13 / 14 / 15 px; weights 500 and 600. Icons 17-18px in 32px buttons.
- Settings swatches: accent tiles and page-color cards share the same geometry (86×48px rounded tiles, 2×6 and
  1×5 grids, names only as tooltips).
- Motion 120-180ms; disabled under `prefers-reduced-motion`.
- Test every UI change in light + dark and in expanded + rail sidebar.
Update when: a design rule changes.

## 6. Conventions and gotchas

- Files that export components must not export unrelated things (fast-refresh): SlashIcons/Glyph,
  clipboard-menu, folder-covers and UiWidthsProvider exist because of that rule.
- Pointer drags: wrap `setPointerCapture` in try/catch (synthetic/stale pointers throw) and commit once on
  pointer-up. Image resize pins the top-left corner and commits `align: 'left'`.
- New notes take the folder from the current route (`routeFolderId` in deps — a stale closure once filed notes
  into the wrong folder).
- Pasted base64 images need `allowBase64: true` (TipTap's default drops data URIs and leaks raw markup).
- Left/right image alignment floats (text wraps); the `float` attr can be toggled off in the ·· menu. A
  trailing empty paragraph is kept after a trailing floated image so it can be typed beside.
- `makeQuote` (lib/editor/quote.ts) strips one wrapping pair of quotes when text becomes a blockquote.
- Mark colors (quote backgrounds, reader highlight/pen/sticky, editor highlight paint) come from one palette: src/lib/theme/palette.ts + --mark-* CSS vars — change colors there only.
- Quote blocks: a trailing empty paragraph is enforced by an appendTransaction plugin, and edge-typed quotation marks are stripped live — clicking below a quote always exits it.
- Editor word count is debounced (400ms) — computing it per keystroke lagged long notes.
- The top bar reserves the native window-buttons area via useWindowControlsInset (Window Controls Overlay API) — don't place interactive elements there.
- Menus share .toolbar-menu CSS (min 208px, items 32px nowrap, keyboard nav in ContextMenu + toolbar portal) — style new menus only through that block, and never add trailing "…" to labels.
- The password-manager reveal in NotesPage requires typing the PIN in search AND pressing Enter; success also unlocks the vault session (no second prompt).
- Note scroll positions live in noteScrollMemory (NoteEditor.tsx), saved by onScroll and restored with frame retries — the unmount cleanup must not write (it fires mid-transition and would overwrite with 0).
- An untouched empty whiteboard is deleted on unmount (no shell litter) — creating a board via automation must
  draw something or it disappears.
- `--max-warnings 0` lint: any new warning fails the gate. Fix it, don't suppress.
Update when: a gotcha is discovered or no longer applies.

## 7. Development

| Command | Does |
|---|---|
| `npm run dev` | Vite dev server (renderer only) |
| `npm run desktop` | Build + run the Electron app |
| `npm run dist:win` | Build + package installer to `release-windows/` |
| `npm test` / `npm run lint` | Vitest / ESLint (`--max-warnings 0`) |

Definition of done: lint clean, `npx tsc --noEmit` clean, tests pass, change checked in the running app.
Tests: 38 tests in 10 files (paste pipeline, whiteboard preview, repositories, sync, NoteEditor, UI components).
Not covered: Electron main/preload, Drive network layer, Excalidraw canvas.
Update when: scripts, tooling or test coverage change.

## 8. Build and release

Version lives in `package.json` (`version`). Steps: bump version → `npm run dist:win` →
`release-windows/My-Notes-Setup-<version>.exe` → attach to a GitHub Release (`npm run release:win` publishes
directly via electron-builder). electron-updater checks Releases and prompts in-app. Code signing: none.
Google Drive OAuth: client config in `.env` / `.env.example` (never commit secrets).
Update when: the release process or signing changes.

## 9. Security and privacy

Local-first: data stays in IndexedDB unless sync is on. Electron: contextIsolation on, nodeIntegration off,
sandbox on; renderer-drawn context menus instead of native ones. OAuth runs in the system browser with a
loopback redirect catch. Never log or store decrypted content, PINs or keys; only PBKDF2 hashes + salts
persist. Backups and exports contain plaintext — the user chooses the folder.
Update when: any of the above changes.

## 10. Status

**Next up:** tracked in ai/ROADMAP.md (the only work index). Top of queue: 1) decide the bootstrap merge (B2) · 2) GitHub protection rules (G1–G3, human) · 3) release the next Tipot version (REL1, after the upgrade test) · 4) floated-image cursor placement (T1).

**Known issues**
- CUA-driven browser automation clicks need a 1.1 device-pixel correction on some setups (test-harness only).

**Decisions:** moved to ai/DECISIONS.md (append-only log).

## 11. Recent major changes (max 5, newest first)

- 2026-10-07 · Reader highlighter tool (drag paints live marks), unified 8-color mark palette across quote/highlight/pen/sticky, vault PIN+Enter unlock (no second prompt), instant warm note opens + scroll restore through Settings, quote background fix (data-bg on node content), new-note button resets a dirty blank editor · Verified: tsc, lint, 38/38 tests, browser checks.
- 2026-10-06 · Editor media: floating image alignment with text wrap toggle, invisible corner resize zone,
  inline alt-text popover, quote blocks with ·· menu + background tints; two accents (Sky, Magenta) and Slate
  page color; tighter editor paragraph spacing · Verified: tsc, lint, 38/38 tests, browser checks.
- 2026-10-06 · UI restructure: top-bar create/settings/account icons, sidebar cleanup (notebook dialog with
  cover images, rail +), PIN setup fix (regex bug blocked all saves), settings accent grid + click-outside,
  whiteboard back-to-note, PROGRESS.md introduced · Verified: tsc, lint, 38/38 tests, browser checks.
  file splits); fixed base64 image paste leak and stale `routeFolderId` on note creation · Verified: gates + app.
- 2026-10-05 · Design guide: OKLCH accent system, surface tokens, reader annotations, resizable embeds, folder
  context menu, auto-update via GitHub Releases, PIN race + paste duplication fixes · Verified: 38/38 tests.
