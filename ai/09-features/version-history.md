# Version History.Md

**Purpose:** Per-note snapshots with restore.

**Key files:** src/components/notes/VersionHistoryModal.tsx, src/lib/db/note-versions.repository.ts, noteVersions table.

**Data:** noteVersions: id, noteId, createdAt, content snapshot.

**How it works:**
1. Version history modal lists snapshots. 2. Restore writes the snapshot content back through noteService.

**Invariants / do-not-break rules:** Snapshots never contain decrypted content of protected notes unless the product documents it (check ai/07).

**Edge cases and gotchas:** Restore goes through the normal save path so autosave stays consistent.

**Tests:** Repository tests. Missing: restore-with-encryption test.

**Known issues:** None known.

**Open questions:** None.
