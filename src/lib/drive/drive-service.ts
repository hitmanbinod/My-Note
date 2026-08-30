import { db } from '@/lib/db/database';
import { getValidAccessToken } from '@/lib/auth/google-auth';

const API = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';

export interface AppFolderIds {
  appFolderDriveId: string;
  notesFolderDriveId: string;
  attachmentsFolderDriveId: string;
  trashFolderDriveId: string;
  foldersFolderDriveId: string;
}

async function driveFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = await getValidAccessToken();
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.headers || {}) }
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Drive API ${res.status}: ${body || res.statusText}`);
  }
  return res;
}

function escapeQueryValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function findChild(name: string, parentId: string, mimeType: string): Promise<string | null> {
  const q = [
    `name = '${escapeQueryValue(name)}'`,
    `'${parentId}' in parents`,
    `mimeType = '${mimeType}'`,
    'trashed = false'
  ].join(' and ');
  const res = await driveFetch(`${API}/files?q=${encodeURIComponent(q)}&fields=files(id)&spaces=drive`);
  const data = await res.json();
  return data.files?.[0]?.id ?? null;
}

async function ensureFolder(name: string, parentId: string): Promise<string> {
  const existing = await findChild(name, parentId, 'application/vnd.google-apps.folder');
  if (existing) return existing;

  const res = await driveFetch(`${API}/files?fields=id`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId]
    })
  });
  const data = await res.json();
  return data.id;
}

/** Creates (or reuses) the app's Drive folder tree and caches the ids in settings. */
export async function ensureAppFolders(): Promise<AppFolderIds> {
  const settings = await db.settings.get('singleton');
  if (
    settings?.appFolderDriveId &&
    settings.notesFolderDriveId &&
    settings.attachmentsFolderDriveId &&
    settings.trashFolderDriveId &&
    settings.foldersFolderDriveId
  ) {
    return {
      appFolderDriveId: settings.appFolderDriveId,
      notesFolderDriveId: settings.notesFolderDriveId,
      attachmentsFolderDriveId: settings.attachmentsFolderDriveId,
      trashFolderDriveId: settings.trashFolderDriveId,
      foldersFolderDriveId: settings.foldersFolderDriveId
    };
  }

  const appFolderDriveId = settings?.appFolderDriveId || (await findChild('My Notes', 'root', 'application/vnd.google-apps.folder')) || (await createRootFolder());
  const notesFolderDriveId = settings?.notesFolderDriveId || (await ensureFolder('Notes', appFolderDriveId));
  const attachmentsFolderDriveId = settings?.attachmentsFolderDriveId || (await ensureFolder('Attachments', appFolderDriveId));
  const trashFolderDriveId = settings?.trashFolderDriveId || (await ensureFolder('Trash', appFolderDriveId));
  const foldersFolderDriveId = settings?.foldersFolderDriveId || (await ensureFolder('Folders', appFolderDriveId));

  const ids: AppFolderIds = {
    appFolderDriveId,
    notesFolderDriveId,
    attachmentsFolderDriveId,
    trashFolderDriveId,
    foldersFolderDriveId
  };
  await db.settings.update('singleton', ids);
  return ids;
}

async function createRootFolder(): Promise<string> {
  const res = await driveFetch(`${API}/files?fields=id`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'My Notes', mimeType: 'application/vnd.google-apps.folder', parents: ['root'] })
  });
  const data = await res.json();
  return data.id;
}

function buildMultipartBody(boundary: string, metadata: object, content: string): string {
  return (
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    'Content-Type: application/json\r\n\r\n' +
    `${content}\r\n` +
    `--${boundary}--`
  );
}

export interface DriveWriteResult {
  id: string;
  modifiedTime: string;
}

/** Creates a new JSON file in the given Drive folder. */
export async function createJsonFile(name: string, parentId: string, content: unknown): Promise<DriveWriteResult> {
  const boundary = `notesapp-${Math.random().toString(36).slice(2)}`;
  const body = buildMultipartBody(boundary, { name, parents: [parentId], mimeType: 'application/json' }, JSON.stringify(content));

  const res = await driveFetch(`${UPLOAD_API}/files?uploadType=multipart&fields=id,modifiedTime`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body
  });
  return await res.json();
}

/** Overwrites the content of an existing JSON file, keeping its name/parents. */
export async function updateJsonFile(fileId: string, content: unknown): Promise<DriveWriteResult> {
  const res = await driveFetch(`${UPLOAD_API}/files/${fileId}?uploadType=media&fields=id,modifiedTime`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(content)
  });
  return await res.json();
}

export async function downloadJsonFile<T>(fileId: string): Promise<T> {
  const res = await driveFetch(`${API}/files/${fileId}?alt=media`);
  return (await res.json()) as T;
}

export interface DriveListedFile {
  id: string;
  name: string;
  modifiedTime: string;
}

export async function listFolderFiles(parentId: string): Promise<DriveListedFile[]> {
  const q = `'${parentId}' in parents and trashed = false`;
  const res = await driveFetch(`${API}/files?q=${encodeURIComponent(q)}&fields=files(id,name,modifiedTime)&pageSize=1000&spaces=drive`);
  const data = await res.json();
  return data.files ?? [];
}

/** Moves a file between two parent folders (used to trash/restore synced notes). */
export async function moveFile(fileId: string, addParent: string, removeParent: string): Promise<void> {
  await driveFetch(`${API}/files/${fileId}?addParents=${addParent}&removeParents=${removeParent}`, { method: 'PATCH' });
}

/** Best-effort delete — a file already gone on Drive is not an error for us. */
export async function deleteFile(fileId: string): Promise<void> {
  try {
    await driveFetch(`${API}/files/${fileId}`, { method: 'DELETE' });
  } catch {
    // ponytail: swallow — remote file may already be gone, nothing to reconcile
  }
}
