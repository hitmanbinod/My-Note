import Dexie, { Table } from 'dexie';
import { Note } from '@/types/note';
import { Folder } from '@/types/folder';
import { SyncOperation } from '@/types/sync';
import { AppSettings } from '@/types/settings';
import { AttachmentBlob } from '@/types/attachment';

export class NotesDatabase extends Dexie {
  notes!: Table<Note, string>;
  folders!: Table<Folder, string>;
  attachmentBlobs!: Table<AttachmentBlob, string>;
  syncOperations!: Table<SyncOperation, string>;
  settings!: Table<AppSettings, string>;

  constructor() {
    super('NotesDB');

    this.version(1).stores({
      notes: 'id, folderId, createdAt, updatedAt, accessedAt, isDeleted, isPinned, isStarred, isArchived, syncStatus, driveFileId, *tags',
      folders: 'id, parentId, driveFileId, syncStatus',
      attachmentBlobs: 'id, noteId, driveFileId, cachedAt',
      syncOperations: 'id, status, timestamp, entityId, [entityType+status]',
      settings: 'id'
    });
  }

  async initializeSettings(): Promise<void> {
    const existing = await this.settings.get('singleton');
    if (!existing) {
      await this.settings.add({
        id: 'singleton',
        googleAccessToken: null,
        googleRefreshToken: null,
        googleTokenExpiry: null,
        userEmail: null,
        userName: null,
        userPhotoUrl: null,
        encryptionEnabled: false,
        encryptionSalt: null,
        lastFullSyncTime: null,
        syncInterval: 15,
        appFolderDriveId: null,
        notesFolderDriveId: null,
        attachmentsFolderDriveId: null,
        trashFolderDriveId: null,
        foldersFolderDriveId: null,
        theme: 'system',
        defaultView: 'list',
        sortBy: 'updatedAt',
        sortOrder: 'desc',
        autoLockEnabled: false,
        autoLockMinutes: 15,
        lastUnlockedAt: null,
        onboardingCompleted: false
      });
    }
  }

  async clearAllData(): Promise<void> {
    await this.transaction('rw', this.notes, this.folders, this.attachmentBlobs, this.syncOperations, async () => {
      await this.notes.clear();
      await this.folders.clear();
      await this.attachmentBlobs.clear();
      await this.syncOperations.clear();
    });
  }

  async getStorageUsage(): Promise<{ notes: number; attachments: number; total: number }> {
    const notesCount = await this.notes.count();
    const attachmentsCount = await this.attachmentBlobs.count();
    
    // Estimate storage (rough calculation)
    const notesSize = notesCount * 10000; // ~10KB per note estimate
    const attachmentsSize = attachmentsCount * 500000; // ~500KB per attachment estimate
    
    return {
      notes: notesSize,
      attachments: attachmentsSize,
      total: notesSize + attachmentsSize
    };
  }
}

// Create singleton instance
export const db = new NotesDatabase();

// Track database initialization state
let dbInitialized = false;
const initPromise = db.initializeSettings()
  .then(() => {
    dbInitialized = true;
    console.log('✅ Database initialized successfully');
    console.log('✅ Database tables:', db.tables.map(t => t.name));
  })
  .catch((error) => {
    console.error('❌ Database initialization error:', error);
    console.error('Error details:', error.message, error.stack);
  });

// Export helper to wait for DB
export const waitForDb = () => {
  console.log('⏳ Waiting for database...', dbInitialized ? 'Already ready!' : 'Initializing...');
  if (dbInitialized) return Promise.resolve();
  return initPromise;
};

export const isDbReady = () => dbInitialized;
