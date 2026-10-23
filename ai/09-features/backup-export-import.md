# Backup Export Import.Md

**Purpose:** Local backups and export/import to move data in and out.

**Key files:** src/lib/backup/backup-service.ts, import-service.ts, src/components/notes/ExportModal.tsx, electron/main.cjs (backup IO).

**Data:** JSON: {app: "my-notes" (identifier), version, exportedAt, notes, folders}; file prefix tipot-backup- (legacy my-notes-backup- accepted). Exports: MD, ENEX, HTML.

**How it works:**
1. Export: main process writes JSON to the chosen folder. 2. Snapshot list: prefix filter. 3. Import: sanitizer path → createNote; the importer accepts the legacy app identifier.

**Invariants / do-not-break rules:** The importer must always accept old backups (app: my-notes). Backups are plaintext.

**Edge cases and gotchas:** Prefix lists accept both tipot- and my-notes- prefixes (rename transition).

**Tests:** import-service tests. Missing: old-backup fixture test.

**Known issues:** None known.

**Open questions:** None.
