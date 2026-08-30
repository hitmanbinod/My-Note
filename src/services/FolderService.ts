import { Folder, CreateFolderInput, UpdateFolderInput } from '@/types';
import { foldersRepository } from '@/lib/db/folders.repository';
import { db } from '@/lib/db/database';

export class FolderService {
  /**
   * Create a new folder
   */
  async createFolder(input: CreateFolderInput): Promise<Folder> {
    const folder = await foldersRepository.create(input);
    await this.queueSync('create', folder.id);
    return folder;
  }

  /**
   * Get a folder by ID
   */
  async getFolder(id: string): Promise<Folder | undefined> {
    return await foldersRepository.get(id);
  }

  /**
   * Update a folder
   */
  async updateFolder(id: string, updates: UpdateFolderInput): Promise<Folder | undefined> {
    const folder = await foldersRepository.update(id, updates);
    if (folder) {
      await this.queueSync('update', id);
    }
    return folder;
  }

  /**
   * Delete a folder
   */
  async deleteFolder(id: string): Promise<void> {
    const folder = await foldersRepository.get(id);
    await foldersRepository.delete(id);
    await this.queueSync('delete', id, folder?.driveFileId ?? null);
  }

  /**
   * List all folders
   */
  async listFolders(): Promise<Folder[]> {
    return await foldersRepository.list();
  }

  /**
   * Get child folders
   */
  async getChildFolders(parentId: string | null): Promise<Folder[]> {
    return await foldersRepository.getChildren(parentId);
  }

  /**
   * Queue sync operation
   */
  private async queueSync(
    type: 'create' | 'update' | 'delete',
    folderId: string,
    driveFileId: string | null = null
  ): Promise<void> {
    await db.syncOperations.add({
      id: crypto.randomUUID(),
      type,
      entityType: 'folder',
      entityId: folderId,
      timestamp: Date.now(),
      retryCount: 0,
      lastError: null,
      status: 'pending',
      driveFileId
    });
  }
}

export const folderService = new FolderService();
