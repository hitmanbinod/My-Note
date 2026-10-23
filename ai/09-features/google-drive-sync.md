# Google Drive Sync.Md

**Purpose:** Optional sync of notes/folders to the user's Google Drive.

**Key files:** src/lib/sync/sync-service.ts, src/lib/drive/drive-service.ts, src/hooks/useSync.ts, syncOperations table.

**Data:** syncOperations queue (id, type, entityId, status, retryCount); settings: googleAccessToken/RefreshToken/Expiry, appFolderDriveId, notesFolderDriveId…

**How it works:**
1. Connect: OAuth in the system browser → loopback catch → tokens in settings. 2. Change: syncStatus pending → operation queued → uploaded → completed. 3. Remote root folder named "My Notes" (identifier — do not rename).

**Invariants / do-not-break rules:** Remote folder lookup by name is an identifier. Renaming it would duplicate/orphan remote data.

**Edge cases and gotchas:** OAuth callback expects the redirect URI configured in Google Cloud (desktop uses localhost loopback).

**Tests:** sync-service tests exist. Missing: network-layer tests.

**Known issues:** None known.

**Open questions:** UNVERIFIED: conflict-resolution edge cases on simultaneous edits.
