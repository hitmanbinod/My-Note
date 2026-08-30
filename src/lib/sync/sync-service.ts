import { db } from '@/lib/db/database';
import { Note } from '@/types/note';
import { Folder } from '@/types/folder';
import { SyncInfo, SyncOperation } from '@/types/sync';
import {
  ensureAppFolders,
  createJsonFile,
  updateJsonFile,
  downloadJsonFile,
  moveFile,
  deleteFile,
  listFolderFiles,
  AppFolderIds
} from '@/lib/drive/drive-service';

const MAX_RETRIES = 5;

export type RemoteChangeDecision = 'pull_remote' | 'keep_both' | 'noop';

/**
 * Decides what to do with a note/folder that changed on Drive.
 * Pure so the conflict logic is testable without hitting IndexedDB or the network.
 */
export function decideRemoteChange(
  local: { syncStatus: string; driveModifiedTime: string | null } | undefined,
  remoteModifiedTime: string
): RemoteChangeDecision {
  if (!local) return 'pull_remote';
  if (local.driveModifiedTime === remoteModifiedTime) return 'noop';
  if (local.syncStatus === 'pending') return 'keep_both';
  return 'pull_remote';
}

let listeners: Array<(info: SyncInfo) => void> = [];
let currentInfo: SyncInfo = { state: 'idle', lastSyncTime: null, pendingOperations: 0, error: null };

function setInfo(patch: Partial<SyncInfo>): void {
  currentInfo = { ...currentInfo, ...patch };
  listeners.forEach((fn) => fn(currentInfo));
}

export function subscribeSyncInfo(fn: (info: SyncInfo) => void): () => void {
  listeners.push(fn);
  fn(currentInfo);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}

export function getSyncInfo(): SyncInfo {
  return currentInfo;
}

let syncing = false;

export async function runSync(): Promise<void> {
  if (syncing) return;

  const settings = await db.settings.get('singleton');
  if (!settings?.googleAccessToken) return;

  if (!navigator.onLine) {
    setInfo({ state: 'offline' });
    return;
  }

  syncing = true;
  setInfo({ state: 'syncing', error: null });

  try {
    const folderIds = await ensureAppFolders();
    await pushPending(folderIds);
    await pullNotes(folderIds);
    await pullFolders(folderIds);

    const pending = await db.syncOperations.where('status').equals('pending').count();
    setInfo({ state: 'idle', lastSyncTime: Date.now(), pendingOperations: pending, error: null });
    await db.settings.update('singleton', { lastFullSyncTime: Date.now() });
  } catch (error) {
    setInfo({ state: 'error', error: error instanceof Error ? error.message : String(error) });
  } finally {
    syncing = false;
  }
}

async function pushPending(folderIds: AppFolderIds): Promise<void> {
  const ops = await db.syncOperations.where('status').equals('pending').toArray();

  for (const op of ops) {
    try {
      if (op.entityType === 'note') {
        await pushNote(op, folderIds);
      } else if (op.entityType === 'folder') {
        await pushFolder(op, folderIds);
      }
      await db.syncOperations.delete(op.id);
    } catch (error) {
      const retryCount = op.retryCount + 1;
      await db.syncOperations.update(op.id, {
        retryCount,
        lastError: error instanceof Error ? error.message : String(error),
        status: retryCount >= MAX_RETRIES ? 'failed' : 'pending'
      });
    }
  }
}

async function pushNote(op: SyncOperation, folderIds: AppFolderIds): Promise<void> {
  if (op.type === 'delete') {
    if (op.driveFileId) await deleteFile(op.driveFileId);
    return;
  }

  const note = (await db.notes.get(op.entityId)) as Note | undefined;
  if (!note) return;

  let driveFileId = note.driveFileId;
  let modifiedTime: string;

  if (driveFileId) {
    const result = await updateJsonFile(driveFileId, note);
    modifiedTime = result.modifiedTime;
  } else {
    const result = await createJsonFile(`${note.id}.json`, folderIds.notesFolderDriveId, note);
    driveFileId = result.id;
    modifiedTime = result.modifiedTime;
  }

  if (note.isDeleted) {
    await moveFile(driveFileId, folderIds.trashFolderDriveId, folderIds.notesFolderDriveId).catch(() => {});
  } else {
    await moveFile(driveFileId, folderIds.notesFolderDriveId, folderIds.trashFolderDriveId).catch(() => {});
  }

  await db.notes.update(note.id, {
    driveFileId,
    driveModifiedTime: modifiedTime,
    syncStatus: 'synced',
    lastSyncedVersion: note.localVersion
  } as Partial<Note>);
}

async function pushFolder(op: SyncOperation, folderIds: AppFolderIds): Promise<void> {
  if (op.type === 'delete') {
    if (op.driveFileId) await deleteFile(op.driveFileId);
    return;
  }

  const folder = (await db.folders.get(op.entityId)) as Folder | undefined;
  if (!folder) return;

  let driveFileId = folder.driveFileId;
  if (driveFileId) {
    await updateJsonFile(driveFileId, folder);
  } else {
    const result = await createJsonFile(`${folder.id}.json`, folderIds.foldersFolderDriveId, folder);
    driveFileId = result.id;
  }

  await db.folders.update(folder.id, { driveFileId, syncStatus: 'synced' });
}

async function pullNotes(folderIds: AppFolderIds): Promise<void> {
  const remoteFiles = await listFolderFiles(folderIds.notesFolderDriveId);
  const allLocal = (await db.notes.toArray()) as Note[];
  const localByDriveId = new Map(allLocal.filter((n) => n.driveFileId).map((n) => [n.driveFileId as string, n]));

  for (const file of remoteFiles) {
    const local = localByDriveId.get(file.id);
    const decision = decideRemoteChange(
      local ? { syncStatus: local.syncStatus, driveModifiedTime: local.driveModifiedTime } : undefined,
      file.modifiedTime
    );
    if (decision === 'noop') continue;

    const remoteNote = await downloadJsonFile<Note>(file.id);

    if (decision === 'pull_remote') {
      await db.notes.put({
        ...remoteNote,
        driveFileId: file.id,
        driveModifiedTime: file.modifiedTime,
        syncStatus: 'synced',
        lastSyncedVersion: remoteNote.localVersion
      });
    } else if (decision === 'keep_both' && local) {
      await db.notes.add({
        ...remoteNote,
        id: crypto.randomUUID(),
        title: `${remoteNote.title} (Drive copy)`,
        driveFileId: file.id,
        driveModifiedTime: file.modifiedTime,
        syncStatus: 'synced',
        lastSyncedVersion: remoteNote.localVersion,
        conflictCopyOf: local.id
      });
    }
  }
}

// ponytail: folder pull only adopts brand-new remote folders — existing ones aren't
// re-diffed for renames. Folder edits are rare and low-stakes; add real diffing if that changes.
async function pullFolders(folderIds: AppFolderIds): Promise<void> {
  const remoteFiles = await listFolderFiles(folderIds.foldersFolderDriveId);
  const allLocal = (await db.folders.toArray()) as Folder[];
  const knownDriveIds = new Set(allLocal.filter((f) => f.driveFileId).map((f) => f.driveFileId as string));

  for (const file of remoteFiles) {
    if (knownDriveIds.has(file.id)) continue;
    const remoteFolder = await downloadJsonFile<Folder>(file.id);
    await db.folders.put({ ...remoteFolder, driveFileId: file.id, syncStatus: 'synced' });
  }
}
