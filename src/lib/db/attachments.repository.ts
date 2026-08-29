import { db } from './database';
import { AttachmentBlob } from '@/types';
import { generateUUID } from '@/lib/utils/uuid';

export class AttachmentsRepository {
  async store(noteId: string, blob: Blob): Promise<AttachmentBlob> {
    const attachment: AttachmentBlob = {
      id: generateUUID(),
      noteId,
      blob,
      driveFileId: null,
      cachedAt: Date.now()
    };

    await db.attachmentBlobs.add(attachment);
    return attachment;
  }

  async get(id: string): Promise<AttachmentBlob | undefined> {
    return await db.attachmentBlobs.get(id);
  }

  async getByNote(noteId: string): Promise<AttachmentBlob[]> {
    return await db.attachmentBlobs.where('noteId').equals(noteId).toArray();
  }

  async update(id: string, updates: Partial<AttachmentBlob>): Promise<void> {
    await db.attachmentBlobs.update(id, updates);
  }

  async delete(id: string): Promise<void> {
    await db.attachmentBlobs.delete(id);
  }

  async deleteByNote(noteId: string): Promise<void> {
    const attachments = await this.getByNote(noteId);
    await db.attachmentBlobs.bulkDelete(attachments.map(a => a.id));
  }

  async cleanupOrphaned(): Promise<number> {
    // Get all attachment blob IDs
    const allBlobIds = await db.attachmentBlobs.toCollection().primaryKeys();
    
    // Get all referenced attachment IDs from notes
    const allNotes = await db.notes.toArray();
    const referencedIds = new Set<string>();
    
    allNotes.forEach(note => {
      if ('attachments' in note) {
        note.attachments.forEach(att => referencedIds.add(att.id));
      }
    });
    
    // Find orphaned attachments
    const orphanedIds = allBlobIds.filter(id => !referencedIds.has(id as string));
    
    // Delete orphaned attachments
    if (orphanedIds.length > 0) {
      await db.attachmentBlobs.bulkDelete(orphanedIds as string[]);
    }
    
    return orphanedIds.length;
  }

  async getTotalSize(): Promise<number> {
    const attachments = await db.attachmentBlobs.toArray();
    return attachments.reduce((total, att) => total + att.blob.size, 0);
  }

  async evictOldCache(olderThanDays: number = 30): Promise<number> {
    const cutoffTime = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
    
    const oldAttachments = await db.attachmentBlobs
      .where('cachedAt')
      .below(cutoffTime)
      .and(att => att.driveFileId !== null) // Only evict if uploaded to Drive
      .toArray();
    
    if (oldAttachments.length > 0) {
      await db.attachmentBlobs.bulkDelete(oldAttachments.map(a => a.id));
    }
    
    return oldAttachments.length;
  }
}

export const attachmentsRepository = new AttachmentsRepository();
