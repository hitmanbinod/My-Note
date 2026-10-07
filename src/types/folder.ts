import { SyncStatus } from './note';

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: number;
  updatedAt: number;
  color: string | null;
  icon: string | null;
  /** Contents require the PIN; hidden from lists/search while locked. */
  locked?: boolean;
  driveFileId: string | null;
  syncStatus: SyncStatus;
}

export interface CreateFolderInput {
  name: string;
  parentId?: string | null;
  color?: string | null;
  icon?: string | null;
  locked?: boolean;
}

export interface UpdateFolderInput {
  name?: string;
  parentId?: string | null;
  color?: string | null;
  icon?: string | null;
  locked?: boolean;
}
