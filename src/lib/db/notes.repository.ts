import { db } from './database';
import { Note, NoteFilter, NoteSortField, NoteSortOrder, CreateNoteInput } from '@/types';
import { generateUUID } from '@/lib/utils/uuid';
import { extractPlainText } from '@/lib/utils/text';

export class NotesRepository {
  async create(input: CreateNoteInput): Promise<Note> {
    const now = Date.now();
    const note: Note = {
      id: generateUUID(),
      title: input.title || 'Untitled',
      content: input.content || { type: 'doc', content: [] },
      plainTextContent: input.content ? extractPlainText(input.content) : '',
      createdAt: now,
      updatedAt: now,
      accessedAt: now,
      folderId: input.folderId || null,
      tags: input.tags || [],
      color: input.color || null,
      isPinned: false,
      isStarred: false,
      isArchived: false,
      isDeleted: false,
      deletedAt: null,
      attachments: [],
      syncStatus: 'pending',
      driveFileId: null,
      driveModifiedTime: null,
      localVersion: 1,
      lastSyncedVersion: 0,
      isEncrypted: false,
      encryptionVersion: 0,
      conflictCopyOf: null
    };

    await db.notes.add(note);
    return note;
  }

  async get(id: string): Promise<Note | undefined> {
    const note = await db.notes.get(id);
    return note as Note | undefined;
  }

  async update(id: string, updates: Partial<Note>): Promise<Note | undefined> {
    const existing = await db.notes.get(id);
    if (!existing) return undefined;

    const updated = {
      ...updates,
      updatedAt: Date.now(),
      localVersion: (existing as Note).localVersion + 1,
      syncStatus: 'pending' as const
    };

    // Update plain text if content changed
    if (updates.content) {
      updated.plainTextContent = extractPlainText(updates.content);
    }

    await db.notes.update(id, updated);
    return await this.get(id);
  }

  async delete(id: string): Promise<void> {
    await db.notes.update(id, {
      isDeleted: true,
      deletedAt: Date.now(),
      syncStatus: 'pending'
    });
  }

  async permanentDelete(id: string): Promise<void> {
    await db.notes.delete(id);
  }

  async restore(id: string): Promise<void> {
    await db.notes.update(id, {
      isDeleted: false,
      deletedAt: null,
      syncStatus: 'pending'
    });
  }

  async list(
    filter?: NoteFilter,
    sortBy: NoteSortField = 'updatedAt',
    sortOrder: NoteSortOrder = 'desc'
  ): Promise<Note[]> {
    let collection = db.notes.toCollection();

    // Apply filters
    if (filter?.isDeleted !== undefined) {
      collection = collection.and(note => note.isDeleted === filter.isDeleted);
    }

    if (filter?.folderId !== undefined) {
      collection = collection.and(note => (note as Note).folderId === filter.folderId);
    }

    if (filter?.isPinned !== undefined) {
      collection = collection.and(note => (note as Note).isPinned === filter.isPinned);
    }

    if (filter?.isStarred !== undefined) {
      collection = collection.and(note => (note as Note).isStarred === filter.isStarred);
    }

    if (filter?.isArchived !== undefined) {
      collection = collection.and(note => (note as Note).isArchived === filter.isArchived);
    }

    if (filter?.tag) {
      collection = collection.and(note => (note as Note).tags.includes(filter.tag!));
    }

    // Sort
    const notes = await collection.toArray() as Note[];
    
    notes.sort((a, b) => {
      let aVal: string | number = a[sortBy];
      let bVal: string | number = b[sortBy];

      if (sortBy === 'title') {
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });

    return notes;
  }

  async search(query: string): Promise<Note[]> {
    const lowerQuery = query.toLowerCase();
    
    return await db.notes
      .toCollection()
      .filter(note => {
        const n = note;
        return (
          !n.isDeleted &&
          n.title.toLowerCase().includes(lowerQuery) ||
          n.plainTextContent.toLowerCase().includes(lowerQuery) ||
          n.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
        );
      })
      .toArray() as Note[];
  }

  async countByFolder(folderId: string | null): Promise<number> {
    return await db.notes
      .toCollection()
      .filter(note => note.folderId === folderId && !note.isDeleted)
      .count();
  }

  async getAllTags(): Promise<string[]> {
    const notes = await db.notes.toCollection().filter(note => !note.isDeleted).toArray();
    
    const tagSet = new Set<string>();
    notes.forEach(note => note.tags.forEach(tag => tagSet.add(tag)));
    
    return Array.from(tagSet).sort();
  }

  async getPendingSync(): Promise<Note[]> {
    return await db.notes
      .where('syncStatus')
      .equals('pending')
      .toArray() as Note[];
  }

  async emptyTrash(): Promise<void> {
    const trashedNotes = await db.notes.toCollection().filter(note => note.isDeleted).toArray();

    await db.notes.bulkDelete(trashedNotes.map(n => n.id));
  }

  async bulkUpdate(ids: string[], updates: Partial<Note>): Promise<void> {
    await db.transaction('rw', db.notes, async () => {
      for (const id of ids) {
        await this.update(id, updates);
      }
    });
  }
}

export const notesRepository = new NotesRepository();
