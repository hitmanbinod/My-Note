# Whiteboards.Md

**Purpose:** Excalidraw whiteboards, standalone and embedded in notes.

**Key files:** src/pages/WhiteboardEditorPage.tsx, src/components/whiteboards/WhiteboardPreview.tsx, src/lib/whiteboards/scene.ts, src/lib/editor/whiteboard-preview-extension.tsx, src/lib/whiteboards/constants.ts.

**Data:** whiteboards table: sceneJson (serialized Excalidraw), previewDataUrl, title, scope (note | standalone). Note embeds: whiteboardPreview node (boardId, width%).

**How it works:**
1. Create → editor route (lazy-loaded page). 2. Autosave: handleChange → serializeScene (700ms) + preview (1.5s), appState-only churn ignored. 3. Embed: preview + ·· menu in the note; click opens the board. 4. Leave: empty untouched boards are deleted on unmount.

**Invariants / do-not-break rules:** Board deletion on unmount only when never edited; appState changes must not mark a board edited; back button returns to the originating note.

**Edge cases and gotchas:** Automation/quick visits that never draw will auto-delete the created board. sceneJson is the source of truth; previewDataUrl is cosmetic.

**Tests:** whiteboard-preview-extension.test.ts, scene.test.ts. Missing: autosave timing test.

**Known issues:** None known.

**Open questions:** None.
