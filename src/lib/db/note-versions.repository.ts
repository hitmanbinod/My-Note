import { db } from '@/lib/db/database';
import { NoteVersion } from '@/types/version';
import { JSONContent } from '@tiptap/react';

const MAX_VERSIONS_PER_NOTE = 50;

/** Local version history for notes (UpNote-style snapshots). */
export const noteVersionsRepository = {
  async listByNote(noteId: string): Promise<NoteVersion[]> {
    const versions = await db.noteVersions.where('noteId').equals(noteId).toArray();
    return versions.sort((a, b) => b.createdAt - a.createdAt);
  },

  async add(noteId: string, title: string, content: JSONContent, plainTextContent: string): Promise<void> {
    await db.noteVersions.add({
      id: crypto.randomUUID(),
      noteId,
      title,
      content,
      plainTextContent,
      createdAt: Date.now()
    });
    await this.prune(noteId);
  },

  async remove(id: string): Promise<void> {
    await db.noteVersions.delete(id);
  },

  async prune(noteId: string): Promise<void> {
    const versions = await this.listByNote(noteId);
    const stale = versions.slice(MAX_VERSIONS_PER_NOTE);
    if (stale.length) {
      await db.noteVersions.bulkDelete(stale.map((version) => version.id));
    }
  },

  async removeForNote(noteId: string): Promise<void> {
    const versions = await db.noteVersions.where('noteId').equals(noteId).toArray();
    await db.noteVersions.bulkDelete(versions.map((version) => version.id));
  }
};
