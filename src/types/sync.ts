export type SyncOperationType =
  | 'create'
  | 'update'
  | 'delete'
  | 'upload_attachment'
  | 'delete_attachment';

export type SyncEntityType = 'note' | 'folder' | 'attachment';

export type SyncOperationStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface SyncOperation {
  id: string;
  type: SyncOperationType;
  entityType: SyncEntityType;
  entityId: string;
  timestamp: number;
  retryCount: number;
  lastError: string | null;
  status: SyncOperationStatus;
}

export type SyncState = 'idle' | 'syncing' | 'offline' | 'error' | 'paused';

export interface SyncStatus {
  state: SyncState;
  lastSyncTime: number | null;
  pendingOperations: number;
  error: string | null;
}

export interface DriveFile {
  id: string;
  name: string;
  modifiedTime: string;
  md5Checksum?: string;
  size?: number;
}

export interface ConflictResolution {
  localNote: any;
  remoteNote: any;
  resolution: 'keep_local' | 'keep_remote' | 'keep_both';
}
