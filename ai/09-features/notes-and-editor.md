# Notes And Editor.Md

**Purpose:** Create, edit and autosave rich-text notes — the core of the app.

**Key files:** src/components/notes/NoteEditor.tsx, src/components/editor/TiptapEditor.tsx, src/hooks/useNotes.ts, src/lib/db/notes.repository.ts, src/lib/editor/extensions.ts

**Data:** notes table (full row); editor content stored as TipTap JSON in note.content; plainTextContent mirrors text for search.

**How it works:**
1. Open: useNote(id) reads (session cache first) → state initialized → TipTapEditor setContent. 2. Type: onUpdate → content state → autosave debounce 1s → saveNow → updateNote. 3. New note: /notes/new lazy-creates on first save, pendingBodyFocus moves the caret to the body. 4. Switching notes: session cache makes warm opens instant; scroll restored from noteScrollMemory.

**Invariants / do-not-break rules:** initialized guard prevents saved-state overwrites; noteId change resets initialized; autosave skips untouched notes; quote/whiteboard trailing paragraphs enforced by appendTransaction.

**Edge cases and gotchas:** TipTap setContent resets selection; do not setContent while the user types. Stale editor refs after remount (tests must re-capture). Trailing empty paragraphs are enforced, do not remove them.

**Tests:** NoteEditor.test.tsx (creation flow). Missing: full autosave round-trip against Dexie.

**Known issues:** Long-note switch cost = full TipTap doc rebuild.

**Open questions:** UNVERIFIED: whether the editor ever needs virtualization for 1000+ paragraph notes.
