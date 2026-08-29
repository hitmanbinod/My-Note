import { Note, CreateNoteInput, UpdateNoteInput, NoteFilter, NoteSortField, NoteSortOrder } from '@/types';
import { notesRepository } from '@/lib/db/notes.repository';
import { db } from '@/lib/db/database';
import { encryptNote, decryptNote, deriveKey } from '@/lib/crypto/encryption';
import { generateSalt, base64ToArrayBuffer } from '@/lib/utils/crypto';

export class NoteService {
  private encryptionKey: CryptoKey | null = null;

  /**
   * Set encryption key for the session
   */
  setEncryptionKey(key: CryptoKey | null): void {
    this.encryptionKey = key;
  }

  /**
   * Check if encryption is enabled
   */
  async isEncryptionEnabled(): Promise<boolean> {
    const settings = await db.settings.get('singleton');
    return settings?.encryptionEnabled || false;
  }

  /**
   * Unlock encryption with password
   */
  async unlock(password: string): Promise<boolean> {
    const settings = await db.settings.get('singleton');
    if (!settings?.encryptionSalt) {
      throw new Error('Encryption not configured');
    }

    try {
      const salt = base64ToArrayBuffer(settings.encryptionSalt);
      const key = await deriveKey(password, new Uint8Array(salt));
      
      // Test the key by trying to decrypt a note (if any exist)
      const encryptedNotes = await db.notes.limit(1).toArray();
      if (encryptedNotes.length > 0 && 'isEncrypted' in encryptedNotes[0]! && encryptedNotes[0].isEncrypted) {
        await decryptNote(encryptedNotes[0] as any, key);
      }
      
      this.encryptionKey = key;
      await db.settings.update('singleton', { lastUnlockedAt: Date.now() });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Lock the application
   */
  lock(): void {
    this.encryptionKey = null;
  }

  /**
   * Create a new note
   */
  async createNote(input: CreateNoteInput): Promise<Note> {
    console.log('📝 Creating note...', input);
    
    try {
      const encryptionEnabled = await this.isEncryptionEnabled();
      console.log('🔒 Encryption enabled:', encryptionEnabled);
      
      // Create note in repository
      const note = await notesRepository.create(input);
      console.log('✅ Note created in DB:', note.id);
      
      // Encrypt if needed
      if (encryptionEnabled && this.encryptionKey) {
        const settings = await db.settings.get('singleton');
        if (settings?.encryptionSalt) {
          const salt = base64ToArrayBuffer(settings.encryptionSalt);
          const encryptedNote = await encryptNote(note, this.encryptionKey, new Uint8Array(salt));
          await db.notes.update(note.id, encryptedNote as any);
          console.log('🔐 Note encrypted');
        }
      }
      
      // Queue for sync
      await this.queueSync('create', note.id);
      console.log('📤 Note queued for sync');
      
      return note;
    } catch (error) {
      console.error('❌ Error creating note:', error);
      throw error;
    }
  }

  /**
   * Get a note by ID
   */
  async getNote(id: string): Promise<Note | undefined> {
    const note = await notesRepository.get(id);
    
    if (!note) return undefined;
    
    // Decrypt if needed
    if ('isEncrypted' in note && note.isEncrypted) {
      if (!this.encryptionKey) {
        throw new Error('Application is locked. Please unlock to view encrypted notes.');
      }
      return await decryptNote(note as any, this.encryptionKey);
    }
    
    return note as Note;
  }

  /**
   * Update a note
   */
  async updateNote(id: string, updates: UpdateNoteInput): Promise<Note | undefined> {
    const existing = await this.getNote(id);
    if (!existing) return undefined;
    
    // Update note
    const updated = await notesRepository.update(id, updates);
    if (!updated) return undefined;
    
    // Re-encrypt if needed
    if (existing.isEncrypted && this.encryptionKey) {
      const settings = await db.settings.get('singleton');
      if (settings?.encryptionSalt) {
        const salt = base64ToArrayBuffer(settings.encryptionSalt);
        const encryptedNote = await encryptNote(updated, this.encryptionKey, new Uint8Array(salt));
        await db.notes.update(id, encryptedNote as any);
      }
    }
    
    // Queue for sync
    await this.queueSync('update', id);
    
    return updated;
  }

  /**
   * Delete a note (soft delete - move to trash)
   */
  async deleteNote(id: string): Promise<void> {
    await notesRepository.delete(id);
    await this.queueSync('update', id);
  }

  /**
   * Permanently delete a note
   */
  async permanentlyDeleteNote(id: string): Promise<void> {
    await notesRepository.permanentDelete(id);
    await this.queueSync('delete', id);
  }

  /**
   * Restore a note from trash
   */
  async restoreNote(id: string): Promise<void> {
    await notesRepository.restore(id);
    await this.queueSync('update', id);
  }

  /**
   * List notes with filters
   */
  async listNotes(
    filter?: NoteFilter,
    sortBy?: NoteSortField,
    sortOrder?: NoteSortOrder
  ): Promise<Note[]> {
    const notes = await notesRepository.list(filter, sortBy, sortOrder);
    
    // Decrypt encrypted notes if key is available
    const decryptedNotes: Note[] = [];
    for (const note of notes) {
      if ('isEncrypted' in note && note.isEncrypted) {
        if (this.encryptionKey) {
          try {
            const decrypted = await decryptNote(note as any, this.encryptionKey);
            decryptedNotes.push(decrypted);
          } catch (error) {
            // Skip notes that can't be decrypted
            console.error('Failed to decrypt note:', note.id, error);
          }
        }
      } else {
        decryptedNotes.push(note as Note);
      }
    }
    
    return decryptedNotes;
  }

  /**
   * Search notes
   */
  async searchNotes(query: string): Promise<Note[]> {
    if (!query.trim()) return [];
    
    const encryptionEnabled = await this.isEncryptionEnabled();
    
    // If encryption is enabled, we need to decrypt all notes to search
    if (encryptionEnabled && this.encryptionKey) {
      const allNotes = await this.listNotes({ isDeleted: false });
      const lowerQuery = query.toLowerCase();
      
      return allNotes.filter(note =>
        note.title.toLowerCase().includes(lowerQuery) ||
        note.plainTextContent.toLowerCase().includes(lowerQuery) ||
        note.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
      );
    }
    
    // For unencrypted notes, use repository search
    return await notesRepository.search(query);
  }

  /**
   * Get all tags
   */
  async getAllTags(): Promise<string[]> {
    return await notesRepository.getAllTags();
  }

  /**
   * Pin/unpin note
   */
  async togglePin(id: string): Promise<void> {
    const note = await this.getNote(id);
    if (note) {
      await this.updateNote(id, { isPinned: !note.isPinned });
    }
  }

  /**
   * Star/unstar note
   */
  async toggleStar(id: string): Promise<void> {
    const note = await this.getNote(id);
    if (note) {
      await this.updateNote(id, { isStarred: !note.isStarred });
    }
  }

  /**
   * Archive/unarchive note
   */
  async toggleArchive(id: string): Promise<void> {
    const note = await this.getNote(id);
    if (note) {
      await this.updateNote(id, { isArchived: !note.isArchived });
    }
  }

  /**
   * Duplicate note
   */
  async duplicateNote(id: string): Promise<Note> {
    const original = await this.getNote(id);
    if (!original) {
      throw new Error('Note not found');
    }
    
    return await this.createNote({
      title: `${original.title} (Copy)`,
      content: original.content,
      folderId: original.folderId,
      tags: [...original.tags],
      color: original.color
    });
  }

  /**
   * Move note to folder
   */
  async moveToFolder(id: string, folderId: string | null): Promise<void> {
    await this.updateNote(id, { folderId });
  }

  /**
   * Update note tags
   */
  async updateTags(id: string, tags: string[]): Promise<void> {
    await this.updateNote(id, { tags });
  }

  /**
   * Update note color
   */
  async updateColor(id: string, color: string | null): Promise<void> {
    await this.updateNote(id, { color });
  }

  /**
   * Empty trash
   */
  async emptyTrash(): Promise<void> {
    await notesRepository.emptyTrash();
  }

  /**
   * Get notes count by folder
   */
  async getNotesCountByFolder(folderId: string | null): Promise<number> {
    return await notesRepository.countByFolder(folderId);
  }

  /**
   * Bulk operations
   */
  async bulkDelete(ids: string[]): Promise<void> {
    await notesRepository.bulkUpdate(ids, { 
      isDeleted: true, 
      deletedAt: Date.now() 
    });
    
    for (const id of ids) {
      await this.queueSync('update', id);
    }
  }

  async bulkMoveToFolder(ids: string[], folderId: string | null): Promise<void> {
    await notesRepository.bulkUpdate(ids, { folderId });
    
    for (const id of ids) {
      await this.queueSync('update', id);
    }
  }

  async bulkUpdateTags(ids: string[], tags: string[]): Promise<void> {
    await notesRepository.bulkUpdate(ids, { tags });
    
    for (const id of ids) {
      await this.queueSync('update', id);
    }
  }

  /**
   * Queue sync operation
   */
  private async queueSync(type: 'create' | 'update' | 'delete', noteId: string): Promise<void> {
    await db.syncOperations.add({
      id: crypto.randomUUID(),
      type,
      entityType: 'note',
      entityId: noteId,
      timestamp: Date.now(),
      retryCount: 0,
      lastError: null,
      status: 'pending'
    });
  }
}

// Singleton instance
export const noteService = new NoteService();
