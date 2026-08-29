import { db } from './database';
import { Folder, CreateFolderInput, UpdateFolderInput } from '@/types';
import { generateUUID } from '@/lib/utils/uuid';

export class FoldersRepository {
  async create(input: CreateFolderInput): Promise<Folder> {
    const now = Date.now();
    const folder: Folder = {
      id: generateUUID(),
      name: input.name,
      parentId: input.parentId || null,
      createdAt: now,
      updatedAt: now,
      color: input.color || null,
      icon: input.icon || null,
      driveFileId: null,
      syncStatus: 'pending'
    };

    await db.folders.add(folder);
    return folder;
  }

  async get(id: string): Promise<Folder | undefined> {
    return await db.folders.get(id);
  }

  async update(id: string, updates: UpdateFolderInput): Promise<Folder | undefined> {
    await db.folders.update(id, {
      ...updates,
      updatedAt: Date.now(),
      syncStatus: 'pending'
    });
    return await this.get(id);
  }

  async delete(id: string): Promise<void> {
    // Delete folder and all its notes
    await db.transaction('rw', db.folders, db.notes, async () => {
      await db.folders.delete(id);
      
      // Move notes to no folder
      const notesInFolder = await db.notes.where('folderId').equals(id).toArray();
      for (const note of notesInFolder) {
        await db.notes.update(note.id, {
          folderId: null,
          syncStatus: 'pending'
        });
      }
    });
  }

  async list(): Promise<Folder[]> {
    return await db.folders.orderBy('name').toArray();
  }

  async getChildren(parentId: string | null): Promise<Folder[]> {
    return await db.folders.where('parentId').equals(parentId).toArray();
  }

  async getPendingSync(): Promise<Folder[]> {
    return await db.folders.where('syncStatus').equals('pending').toArray();
  }
}

export const foldersRepository = new FoldersRepository();
