export type Theme = 'light' | 'dark' | 'system';
export type DefaultView = 'list' | 'grid';

export interface AppSettings {
  id: 'singleton';

  // Authentication
  googleAccessToken: string | null;
  googleRefreshToken: string | null;
  googleTokenExpiry: number | null;
  userEmail: string | null;
  userName: string | null;
  userPhotoUrl: string | null;

  // Encryption
  encryptionEnabled: boolean;
  encryptionSalt: string | null;

  // Sync
  lastFullSyncTime: number | null;
  syncInterval: number; // minutes
  appFolderDriveId: string | null;
  notesFolderDriveId: string | null;
  attachmentsFolderDriveId: string | null;
  trashFolderDriveId: string | null;
  foldersFolderDriveId: string | null;

  // UI preferences
  theme: Theme;
  defaultView: DefaultView;
  sortBy: 'updatedAt' | 'createdAt' | 'title';
  sortOrder: 'asc' | 'desc';

  // Security
  autoLockEnabled: boolean;
  autoLockMinutes: number;
  lastUnlockedAt: number | null;

  // First-time setup
  onboardingCompleted: boolean;
}

export interface UpdateSettingsInput {
  theme?: Theme;
  defaultView?: DefaultView;
  sortBy?: 'updatedAt' | 'createdAt' | 'title';
  sortOrder?: 'asc' | 'desc';
  autoLockEnabled?: boolean;
  autoLockMinutes?: number;
  syncInterval?: number;
  encryptionEnabled?: boolean;
}
