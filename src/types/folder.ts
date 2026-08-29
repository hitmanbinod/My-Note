import { SyncStatus } from './note';

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: number;
  updatedAt: number;
  color: string | null;
  icon: string | null;
  driveFileId: string | null;
  syncStatus: SyncStatus;
}

export interface CreateFolderInput {
  name: string;
  parentId?: string | null;
  color?: string | null;
  icon?: string | null;
}

export interface UpdateFolderInput {
  name?: string;
  parentId?: string | null;
  color?: string | null;
  icon?: string | null;
}
