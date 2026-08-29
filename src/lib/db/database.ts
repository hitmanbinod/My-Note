import Dexie, { Table } from 'dexie';
import { Note } from '@/types/note';
import { Folder } from '@/types/folder';
import { SyncOperation } from '@/types/sync';
import { AppSettings } from '@/types/settings';
import { AttachmentBlob } from '@/types/attachment';
import { Whiteboard } from '@/types/whiteboard';

export class NotesDatabase extends Dexie {
  notes!: Table<Note, string>;
  folders!: Table<Folder, string>;
  attachmentBlobs!: Table<AttachmentBlob, string>;
  syncOperations!: Table<SyncOperation, string>;
  settings!: Table<AppSettings, string>;
  whiteboards!: Table<Whiteboard, string>;

  constructor() {
    super('NotesDB');

    this.version(1).stores({
      notes: 'id, folderId, createdAt, updatedAt, accessedAt, isDeleted, isPinned, isStarred, isArchived, syncStatus, driveFileId, *tags',
      folders: 'id, parentId, driveFileId, syncStatus',
      attachmentBlobs: 'id, noteId, driveFileId, cachedAt',
      syncOperations: 'id, status, timestamp, entityId, [entityType+status]',
      settings: 'id'
    });

    this.version(2).stores({
      notes: 'id, folderId, createdAt, updatedAt, accessedAt, isDeleted, isPinned, isStarred, isArchived, syncStatus, driveFileId, *tags',
      folders: 'id, parentId, driveFileId, syncStatus',
      attachmentBlobs: 'id, noteId, driveFileId, cachedAt',
      syncOperations: 'id, status, timestamp, entityId, [entityType+status]',
      settings: 'id',
      whiteboards: 'id, title, createdAt, updatedAt'
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
    await this.transaction('rw', this.notes, this.folders, this.attachmentBlobs, this.syncOperations, this.whiteboards, async () => {
      await this.notes.clear();
      await this.folders.clear();
      await this.attachmentBlobs.clear();
      await this.syncOperations.clear();
      await this.whiteboards.clear();
    });
  }

  async getStorageUsage(): Promise<{ notes: number; attachments: number; whiteboards: number; total: number }> {
    const notesCount = await this.notes.count();
    const attachmentsCount = await this.attachmentBlobs.count();
    const whiteboards = await this.whiteboards.toArray();
    
    // Estimate storage (rough calculation)
    const notesSize = notesCount * 10000; // ~10KB per note estimate
    const attachmentsSize = attachmentsCount * 500000; // ~500KB per attachment estimate
    const whiteboardsSize = whiteboards.reduce(
      (total, board) => total + board.sceneJson.length * 2 + (board.previewDataUrl?.length || 0) * 2,
      0
    );
    
    return {
      notes: notesSize,
      attachments: attachmentsSize,
      whiteboards: whiteboardsSize,
      total: notesSize + attachmentsSize + whiteboardsSize
    };
  }
}

// Create singleton instance
export const db = new NotesDatabase();

// Track database initialization state
let dbInitialized = false;
let initError: Error | null = null;

const initPromise = (async () => {
  try {
    console.log('🔄 Starting database initialization...');
    
    // Test if IndexedDB is available
    if (!window.indexedDB) {
      throw new Error('IndexedDB is not available in this browser');
    }
    
    // Open and initialize
    await db.open();
    await db.initializeSettings();
    
    dbInitialized = true;
    initError = null;
    
    console.log('✅ Database initialized successfully');
    console.log('✅ Database tables:', db.tables.map(t => t.name).join(', '));
    
    return true;
  } catch (error) {
    dbInitialized = false;
    initError = error instanceof Error ? error : new Error(String(error));
    
    console.error('❌ Database initialization error:', error);
    console.error('Error details:', initError.message);
    
    throw initError;
  }
})();

// Export helper to wait for DB
export const waitForDb = async (): Promise<void> => {
  if (dbInitialized) {
    return Promise.resolve();
  }
  
  if (initError) {
    throw initError;
  }
  
  await initPromise;
};

export const isDbReady = () => dbInitialized;
export const getDbError = () => initError;
