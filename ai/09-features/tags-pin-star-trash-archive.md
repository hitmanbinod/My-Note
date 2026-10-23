# Tags Pin Star Trash Archive.Md

**Purpose:** Note organization flags: tags, pin, star, trash, archive.

**Key files:** src/components/notes/NoteCard.tsx, NoteList.tsx, src/pages/NotesPage.tsx, notes.repository.ts.

**Data:** notes fields: tags (*tags index), isPinned, isStarred, isArchived, isDeleted, deletedAt.

**How it works:**
1. Pin/star toggle from editor header or list right-click. 2. Trash: isDeleted + deletedAt; restore clears; permanent delete removes the row. 3. Archive hides from All notes (kept out of trash). 4. Locked notes require the app PIN and are excluded from every normal view.

**Invariants / do-not-break rules:** Locked notes never appear in normal list queries (repository filters them). Trash sorts by deletedAt; restore clears isDeleted.

**Edge cases and gotchas:** Repository list() already excludes deleted/locked — do not double-filter in components.

**Tests:** Repository tests cover filters. Missing: lock-exclusion test.

**Known issues:** None known.

**Open questions:** None.
