# Notebooks Folders.Md

**Purpose:** Group notes into notebooks (folders) with covers, colors and locks.

**Key files:** src/components/folders/FolderDialog.tsx, src/components/layout/Sidebar.tsx, src/services/FolderService.ts, src/lib/db/folders.repository.ts.

**Data:** folders table: id, name, color, icon (cover image data URL), locked, parentId, syncStatus, timestamps. notes.folderId mirrors the first membership; notes.folderIds lists all.

**How it works:**
1. Create/edit: FolderDialog (name, cover gradient or uploaded image, lock). 2. Delete: notes move to no folder (transaction). 3. Right-click menu: edit, lock, color swatches, delete.

**Invariants / do-not-break rules:** folderIds on notes is the source of truth for multi-membership; folderId mirrors the first. Deleting a folder never deletes notes.

**Edge cases and gotchas:** Cover images are data URLs in the folder row.

**Tests:** None. Missing: move-notes-on-delete test.

**Known issues:** None known.

**Open questions:** None.
