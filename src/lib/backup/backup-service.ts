import { db } from '@/lib/db/database';
import type { Folder, Note } from '@/types';

/**
 * Local backups, UpNote-style: the whole workspace (notes + notebooks) is
 * exported as a dated JSON file into a user-chosen folder, pruned to the
 * configured maximum. Electron writes to that folder directly; in the browser
 * the file is downloaded instead.
 */

const FILE_PREFIX = 'tipot-backup-'; // old builds wrote 'my-notes-backup-' — the lister accepts both

export interface BackupPayload {
  app: 'my-notes';
  version: 1;
  exportedAt: number;
  notes: Note[];
  folders: Folder[];
}

export function backupFileName(exportedAt: number): string {
  const d = new Date(exportedAt);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${FILE_PREFIX}${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.json`;
}

export async function collectPayload(): Promise<BackupPayload> {
  const [notes, folders] = await Promise.all([db.notes.toArray(), db.folders.toArray()]);
  return { app: 'my-notes', version: 1, exportedAt: Date.now(), notes, folders };
}

export async function runBackup(options: { dir?: string | null; maxCount?: number }): Promise<{ ok: boolean; location?: string; error?: string }> {
  try {
    const payload = await collectPayload();
    const json = JSON.stringify(payload, null, 2);
    const fileName = backupFileName(payload.exportedAt);
    const api = window.electronAPI;
    if (api?.backupWrite && options.dir) {
      await api.backupWrite({ dir: options.dir, fileName, json, maxCount: options.maxCount ?? 50 });
      return { ok: true, location: options.dir };
    }
    // Browser fallback: download into the Downloads folder
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
    return { ok: true, location: 'Downloads' };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Restores a Tipot backup. 'merge' only adds notes/notebooks that don't
 * exist yet; 'replace' clears the current workspace first.
 */
export async function restoreFromBackup(json: string, mode: 'merge' | 'replace'): Promise<{ notes: number; folders: number }> {
  let parsed: BackupPayload;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('The backup file is not valid JSON.');
  }
  if (parsed?.app !== 'my-notes' || !Array.isArray(parsed.notes)) {
    throw new Error('This file is not a Tipot backup.');
  }

  if (mode === 'replace') {
    await db.transaction('rw', db.notes, db.folders, async () => {
      await db.notes.clear();
      await db.folders.clear();
      await db.folders.bulkPut(parsed.folders ?? []);
      await db.notes.bulkPut(parsed.notes);
    });
    return { notes: parsed.notes.length, folders: parsed.folders?.length ?? 0 };
  }

  let noteCount = 0;
  let folderCount = 0;
  await db.transaction('rw', db.notes, db.folders, async () => {
    for (const folder of parsed.folders ?? []) {
      const existing = await db.folders.get(folder.id);
      if (!existing) {
        await db.folders.put(folder);
        folderCount++;
      }
    }
    for (const note of parsed.notes) {
      const existing = await db.notes.get(note.id);
      if (!existing) {
        await db.notes.put(note);
        noteCount++;
      }
    }
  });
  return { notes: noteCount, folders: folderCount };
}
