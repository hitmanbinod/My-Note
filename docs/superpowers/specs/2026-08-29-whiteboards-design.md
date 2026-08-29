# Whiteboards Design

## Goal

Add offline, single-user whiteboards powered by the official Excalidraw React component. Users can manage multiple boards, draw in a full editor, export PNG or SVG files, and insert live board previews into notes.

## Scope

The first version includes:

- A Whiteboards section in the existing sidebar.
- A saved-board list with create, rename, open, and delete actions.
- A full Excalidraw editor inside the existing app layout.
- Local autosave to IndexedDB.
- PNG and SVG download.
- A note-toolbar action that inserts a clickable whiteboard preview block.
- Preview blocks that stay current when the board is renamed or edited.
- Light and dark theme support, responsive layout, and keyboard-accessible surrounding controls.

The first version does not include real-time collaboration, cloud synchronization, sharing links, version history, custom drawing tools, or inline whiteboard editing inside a note.

## User Experience

### Navigation

The sidebar gains:

- A primary `New whiteboard` action near `New note`.
- A `Whiteboards` workspace item linking to `/whiteboards`.

The whiteboard routes continue using the existing `Layout`, sidebar, and global header. This is the approved integrated-workspace layout.

### Whiteboard List

`/whiteboards` shows saved boards ordered by most recently updated. Each board card displays its latest thumbnail, title, and last-edited time. Users can create, rename, open, or delete a board.

Deleting a board requires confirmation. Existing note references are not rewritten; they render an unavailable-board state.

### Whiteboard Editor

`/whiteboards/:whiteboardId` contains:

- A compact header with a back action, editable title, save status, PNG export, and SVG export.
- The Excalidraw editor filling the remaining main-content height.
- Excalidraw's native drawing tools, selection, undo/redo, zoom, image support, and keyboard shortcuts.

Save status is one of `Saving…`, `Saved`, or `Save failed`.

### Note Preview

The note editor toolbar gains an `Insert whiteboard` button. It opens a modal listing existing boards and offering `Create whiteboard` when none exist.

Selecting a board inserts an atomic block containing only its board ID. The rendered block reads the current board record from IndexedDB and displays its title and thumbnail. Clicking the block navigates to the full editor. A deleted or missing board displays `Whiteboard unavailable` with no broken image.

## Architecture

### Excalidraw Integration

Use `@excalidraw/excalidraw@0.18.1` with the existing React 18 and Vite application. The component receives saved scene data through `initialData` and reports edits through `onChange`.

The official serialization and export APIs are used:

- `serializeAsJSON` for persisted scenes.
- Excalidraw scene loading utilities for restoration.
- `exportToBlob` for PNG files and thumbnails.
- `exportToSvg` for SVG downloads.

This avoids maintaining custom canvas selection, resizing, text, arrow, undo, export, and accessibility behavior.

### Data Model

Add `src/types/whiteboard.ts`:

```ts
export interface Whiteboard {
  id: string;
  title: string;
  sceneJson: string;
  previewDataUrl: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface CreateWhiteboardInput {
  title?: string;
}

export interface UpdateWhiteboardInput {
  title?: string;
  sceneJson?: string;
  previewDataUrl?: string | null;
}
```

`sceneJson` contains the sanitized Excalidraw elements, app state, and binary files. Storing the official serialized form avoids persisting non-scene runtime state.

Upgrade `NotesDatabase` to Dexie version 2 without changing version 1:

```ts
this.version(2).stores({
  notes: 'id, folderId, createdAt, updatedAt, accessedAt, isDeleted, isPinned, isStarred, isArchived, syncStatus, driveFileId, *tags',
  folders: 'id, parentId, driveFileId, syncStatus',
  attachmentBlobs: 'id, noteId, driveFileId, cachedAt',
  syncOperations: 'id, status, timestamp, entityId, [entityType+status]',
  settings: 'id',
  whiteboards: 'id, title, createdAt, updatedAt'
});
```

`clearAllData()` and storage-usage reporting include whiteboards.

### Persistence

`src/lib/db/whiteboards.repository.ts` owns create, get, list, update, and delete operations. It follows the repository pattern already used for notes and folders and generates IDs with the existing UUID utility.

The editor keeps the latest scene in memory and debounces scene writes by 700 ms. Thumbnail generation uses a separate 1,500 ms idle debounce so pointer movement does not repeatedly export images. Pending work is flushed when the editor unmounts or the document becomes hidden.

If an IndexedDB write fails, the scene remains open in memory, the header displays `Save failed`, and export remains available.

### Note Editor Extension

Add a Tiptap block-node extension named `whiteboardPreview` with one required attribute: `boardId`. It is an atomic block rendered through a React node view.

The node view uses `useLiveQuery` to fetch the board record. This prevents duplicated titles or thumbnails in note JSON and makes embedded previews update automatically.

The extension is registered in the shared editor-extension factory so all note editors parse and render the node consistently.

## Components and Files

New files:

- `src/types/whiteboard.ts` — data contracts.
- `src/lib/db/whiteboards.repository.ts` — IndexedDB operations.
- `src/lib/whiteboards/scene.ts` — scene parsing, serialization, thumbnails, and downloads.
- `src/pages/WhiteboardsPage.tsx` — board list and management.
- `src/pages/WhiteboardEditorPage.tsx` — full editor, autosave, and export.
- `src/components/whiteboards/WhiteboardPicker.tsx` — note insertion modal.
- `src/components/whiteboards/WhiteboardPreview.tsx` — live Tiptap node view.
- `src/lib/editor/whiteboard-preview-extension.tsx` — Tiptap node schema and React renderer.

Modified files:

- `package.json` — `@excalidraw/excalidraw@0.18.1` plus Vitest, jsdom, fake-indexeddb, and React Testing Library as development-only test tooling.
- `src/App.tsx` — whiteboard routes.
- `src/components/layout/Sidebar.tsx` — navigation and create action.
- `src/lib/db/database.ts` — version 2 schema and whiteboard table.
- `src/types/index.ts` — whiteboard exports.
- `src/lib/editor/extensions.ts` — preview-node registration.
- `src/components/editor/EditorToolbar.tsx` — insert-whiteboard action.
- `src/components/editor/TiptapEditor.tsx` — supplies insertion behavior to the toolbar.
- `src/index.css` — whiteboard sizing and preview styles only where utilities are insufficient.
- `.gitignore` — ignores `.superpowers/` visual-companion artifacts.

## Error Handling

- A missing route ID shows `Whiteboard not found` and a link back to the list.
- A corrupt stored scene opens an empty recoverable canvas, shows an error, and does not overwrite the corrupt record until the user edits.
- Save failures keep in-memory work available and leave export enabled.
- Export failures show a concise error without affecting the saved scene.
- Deleting an embedded board leaves a clear unavailable preview in notes.
- All destructive board deletion actions require confirmation.

## Testing and Verification

Implementation follows test-first development.

Automated checks cover:

- Creating, loading, updating, listing, and deleting whiteboard records.
- Preserving serialized scene data across a save/load cycle.
- The note-preview renderer's available and unavailable states.
- Debounced autosave invoking one final persistence write with the newest scene.
- PNG and SVG export helpers receiving the current elements, app state, and files.

Browser-level verification covers:

1. Create a board from the sidebar.
2. Draw and rename it.
3. Observe `Saved`, reload, and confirm the scene returns.
4. Export PNG and SVG.
5. Insert the board into a note and open it through the preview.
6. Delete the board and confirm the note shows the unavailable state.
7. Repeat layout checks at desktop and 375 px widths, in light and dark themes.
8. Navigate surrounding controls by keyboard and confirm visible focus states.

The full production build and lint run remain completion gates. Existing unrelated lint failures are reported separately rather than folded into this feature.

## Success Criteria

The feature is complete when a user can create an offline board, draw with Excalidraw, leave and reopen it without losing work, export it as PNG or SVG, insert a live preview into a note, and open the board by selecting that preview.
