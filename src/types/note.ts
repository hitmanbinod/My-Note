import { JSONContent } from '@tiptap/react';

export type SyncStatus = 'synced' | 'pending' | 'conflict' | 'error';

export interface Attachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  driveFileId: string | null;
  localBlobKey: string | null;
  thumbnailDataUrl: string | null;
  thumbnailWidth: number;
  thumbnailHeight: number;
  uploadedAt: number;
  syncStatus: SyncStatus;
  alt?: string;
  caption?: string;
}

export interface Note {
  id: string;
  title: string;
  content: JSONContent;
  plainTextContent: string;
  createdAt: number;
  updatedAt: number;
  accessedAt: number;
  folderId: string | null;
  tags: string[];
  color: string | null;
  isPinned: boolean;
  isStarred: boolean;
  isArchived: boolean;
  isDeleted: boolean;
  deletedAt: number | null;
  attachments: Attachment[];
  syncStatus: SyncStatus;
  driveFileId: string | null;
  driveModifiedTime: string | null;
  localVersion: number;
  lastSyncedVersion: number;
  isEncrypted: boolean;
  encryptionVersion: number;
  conflictCopyOf: string | null;
}

export interface EncryptedNote {
  id: string;
  isEncrypted: true;
  encryptedBlob: string;
  iv: string;
  authTag: string;
  salt: string;
  encryptionVersion: number;
  createdAt: number;
  updatedAt: number;
  syncStatus: SyncStatus;
  driveFileId: string | null;
  driveModifiedTime: string | null;
  localVersion: number;
  lastSyncedVersion: number;
}

export interface NoteSecrets {
  title: string;
  content: JSONContent;
  plainTextContent: string;
  tags: string[];
  folderId: string | null;
  color: string | null;
  attachments: Attachment[];
  isPinned: boolean;
  isStarred: boolean;
  isArchived: boolean;
  isDeleted: boolean;
  deletedAt: number | null;
  accessedAt: number;
  conflictCopyOf: string | null;
}

export interface CreateNoteInput {
  title?: string;
  content?: JSONContent;
  folderId?: string | null;
  tags?: string[];
  color?: string | null;
}

export interface UpdateNoteInput {
  title?: string;
  content?: JSONContent;
  folderId?: string | null;
  tags?: string[];
  color?: string | null;
  isPinned?: boolean;
  isStarred?: boolean;
  isArchived?: boolean;
  isDeleted?: boolean;
}

export interface NoteFilter {
  folderId?: string | null;
  tag?: string;
  isPinned?: boolean;
  isStarred?: boolean;
  isArchived?: boolean;
  isDeleted?: boolean;
  searchQuery?: string;
}

export type NoteSortField = 'updatedAt' | 'createdAt' | 'title' | 'accessedAt';
export type NoteSortOrder = 'asc' | 'desc';
